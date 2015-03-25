ScriptAsset = SupCore.data.assetClasses.script

CodeMirror = require 'codemirror'
require 'codemirror/addon/search/search'
require 'codemirror/addon/search/searchcursor'
require 'codemirror/addon/edit/closebrackets'
require 'codemirror/addon/comment/comment'
require 'codemirror/keymap/sublime'
require 'codemirror/mode/javascript/javascript'
OT = require 'operational-transform'

qs = require('querystring').parse window.location.search.slice(1)
info = { projectId: qs.project, assetId: qs.asset }
data = null
ui = {}
socket = null

start = ->
  socket = SupClient.connect info.projectId
  socket.on 'welcome', onWelcome
  socket.on 'disconnect', SupClient.onDisconnected
  socket.on 'edit:assets', onAssetEdited
  socket.on 'trash:assets', SupClient.onAssetTrashed
  SupClient.setupHotkeys()

  window.addEventListener "message", (event) =>
    if event.data.type == 'activate' then ui.editor.focus()
    return

  extraKeys =
    'F9': ->
    'Tab': (cm) ->
      if cm.getSelection() != ""
        cm.execCommand 'indentMore'
      else
        cm.replaceSelection Array(cm.getOption("indentUnit") + 1).join " "
      return
    'Ctrl-Z': -> onUndo(); return
    'Cmd-Z': -> onUndo(); return
    'Shift-Ctrl-Z': -> onRedo(); return
    'Shift-Cmd-Z': -> onRedo(); return
    'Ctrl-S': ->
      socket.emit 'edit:assets', info.assetId, 'saveText', (err) -> if err? then alert err; SupClient.onDisconnected(); return
      return
    'Cmd-S': ->
      socket.emit 'edit:assets', info.assetId, 'saveText', (err) -> if err? then alert err; SupClient.onDisconnected(); return
      return

  textArea = document.querySelector('.code-editor')
  ui.editor = CodeMirror.fromTextArea textArea,
    lineNumbers: true, matchBrackets: true, styleActiveLine: true, autoCloseBrackets: true
    gutters: ["line-error-gutter", "CodeMirror-linenumbers"]
    tabSize: 2, keyMap: 'sublime' # , theme: 'monokai'
    extraKeys: extraKeys
    viewportMargin: Infinity
    mode: 'text/typescript'

  ui.tmpCodeMirrorDoc = new CodeMirror.Doc ""
  ui.texts = []

  ui.undoStack = []
  ui.undoQuantityByAction = [0]
  ui.redoStack = []
  ui.redoQuantityByAction = []

  ui.editor.on 'beforeChange', (instance, change) =>
    return if change.origin in ['setValue', 'network']
    lastText = ui.editor.getValue()
    ui.texts.push lastText if lastText != ui.texts[ui.texts.length-1]
    return

  ui.editor.on 'changes', onEditText

  ui.errorContainer = document.querySelector('.error-container')
  ui.errorContainer.querySelector('button').addEventListener "click", =>
    ui.errorContainer.style.display = "none"
    ui.editor.refresh()
    return

  ui.editor.focus()

# Network callbacks
onWelcome = (clientId) ->
  data = { clientId }
  socket.emit 'sub', 'assets', info.assetId, onAssetReceived
  return

onAssetReceived = (err, asset) ->
  data.asset = new ScriptAsset asset

  ui.editor.setValue data.asset.pub.draft
  ui.editor.clearHistory()
  return

onAssetEdited = (id, command, args...) ->
  data.asset.__proto__["client_#{command}"].apply data.asset, args
  onAssetCommands[command]?.apply data.asset, args
  return

onAssetCommands = {}

onAssetCommands.editText = (operationData) ->
  if data.clientId == operationData.userId
    if ui.pendingOperation?
      socket.emit 'edit:assets', info.assetId, 'editText', ui.pendingOperation.serialize(), data.asset.document.operations.length, (err) ->
        if err? then alert err; SupClient.onDisconnected(); return

      ui.sentOperation = ui.pendingOperation
      ui.pendingOperation = null
    else
      ui.sentOperation = null
    return

  # Transform operation and local changes
  operation = new OT.TextOperation
  operation.deserialize operationData

  if ui.sentOperation?
    [ui.sentOperation, operation] = ui.sentOperation.transform operation

    if ui.pendingOperation?
      [ui.pendingOperation, operation] = ui.pendingOperation.transform operation

  ui.undoStack = transformStack ui.undoStack, operation
  ui.redoStack = transformStack ui.redoStack, operation

  applyOperation operation.clone(), 'network', false
  return

transformStack = (stack, operation)->
  return stack if stack.length == 0

  newStack = []
  for i in [stack.length-1 .. 0]
    pair = stack[i].transform operation
    newStack.push pair[0]
    operation = pair[1]
  return newStack.reverse()

applyOperation = (operation, origin, moveCursor) ->
  cursorPosition = 0
  line = 0
  for op in operation.ops
    switch op.type
      when 'retain'
        loop
          break if op.attributes.amount <= ui.editor.getLine(line).length - cursorPosition

          op.attributes.amount -= ui.editor.getLine(line).length + 1 - cursorPosition
          cursorPosition = 0
          line++

        cursorPosition += op.attributes.amount

      when 'insert'
        cursor = ui.editor.getCursor()

        texts = op.attributes.text.split '\n'
        for text, textIndex in texts
          text += '\n' if textIndex != texts.length - 1
          ui.editor.replaceRange text, { line, ch: cursorPosition }, null, origin
          cursorPosition += text.length

          if textIndex != texts.length - 1
            cursorPosition = 0
            line++

        if line == cursor.line and cursorPosition == cursor.ch
          if ! operation.gotPriority data.clientId
            ui.editor.execCommand 'goCharLeft' for i in [0 ... op.attributes.text.length ]

        ui.editor.setCursor line, cursorPosition if moveCursor

      when 'delete'
        texts = op.attributes.text.split '\n'

        for text, textIndex in texts
          if texts[textIndex + 1]?
            ui.editor.replaceRange '', { line, ch: cursorPosition }, { line: line + 1, ch: 0 }, origin
          else
            ui.editor.replaceRange '', { line, ch: cursorPosition }, { line, ch: cursorPosition + text.length }, origin

        ui.editor.setCursor line, cursorPosition if moveCursor
  return

onAssetCommands.saveText = (errors) ->
  # Remove all previous erros
  for textMarker in ui.editor.getAllMarks()
    continue if textMarker.className != "line-error"
    textMarker.clear()

  for line in [0...ui.editor.lineCount()]
    ui.editor.setGutterMarker line, "line-error-gutter", null

  # Display new ones
  if errors.length == 0
    ui.errorContainer.style.display = "none"
    ui.editor.refresh()
    return

  ui.errorContainer.style.display = "flex"
  ui.editor.refresh()

  text = ui.errorContainer.querySelector('textarea')
  text.value = ""
  for error in errors
    #console.log "#{error.file}(#{error.position.line}): #{error.message}"
    text.value += "#{error.file}(#{error.position.line}): #{error.message}\n"

    line = error.position.line - 1
    textMarker = ui.editor.markText(
      { line , ch: error.position.character-1 },
      { line, ch: error.position.character-1 + error.length },
      { className: 'line-error' } )

    gutter = document.createElement("div")
    gutter.className = "line-error-gutter"
    gutter.innerHTML = "●"
    ui.editor.setGutterMarker line, "line-error-gutter", gutter
  return

# User interface
onEditText = (instance, changes) ->
  undoRedo = false
  for change, changeIndex in changes
    # Modification from an other person
    continue if change.origin in ['setValue', 'network']

    ui.tmpCodeMirrorDoc.setValue ui.texts[changeIndex]

    operation = new OT.TextOperation data.clientId
    for line in [0...change.from.line]
      operation.retain ui.tmpCodeMirrorDoc.getLine(line).length + 1
    operation.retain change.from.ch

    offset = 0
    if change.removed.length != 1 or change.removed[0] != ''
      for text, index in change.removed
        if index != 0
          operation.delete '\n'
          offset += 1

        operation.delete text
        offset += text.length

    if change.text.length != 1 or change.text[0] != ''
      for text, index in change.text
        operation.insert '\n' if index != 0
        operation.insert text

    beforeLength = operation.ops[0].attributes.amount ? 0
    operation.retain ui.tmpCodeMirrorDoc.getValue().length - beforeLength - offset

    if ! operationToSend?
      operationToSend = operation.clone()
    else
      operationToSend = operationToSend.compose operation

    undoRedo = true if change.origin in ['undo', 'redo']

  ui.texts.length = 0
  return if ! operationToSend?

  if ! undoRedo
    if ui.undoTimeout?
      clearTimeout ui.undoTimeout
      ui.undoTimeout = null

    ui.undoStack.push operationToSend.clone().invert()
    ui.undoQuantityByAction[ui.undoQuantityByAction.length-1] += 1
    if ui.undoQuantityByAction[ui.undoQuantityByAction.length-1] > 20
      ui.undoQuantityByAction.push 0
    else
      ui.undoTimeout = setTimeout =>
        ui.undoTimeout = null
        ui.undoQuantityByAction.push 0
        return
      , 500

    ui.redoStack.length = 0
    ui.redoQuantityByAction.length = 0

  if ! ui.sentOperation?
    socket.emit 'edit:assets', info.assetId, 'editText', operationToSend.serialize(), data.asset.document.operations.length, (err) ->
      if err? then alert err; SupClient.onDisconnected(); return

    ui.sentOperation = operationToSend
  else
    if ui.pendingOperation?
      ui.pendingOperation = ui.pendingOperation.compose operationToSend
    else
      ui.pendingOperation = operationToSend

onUndo = ->
  return if ui.undoStack.length == 0

  ui.undoQuantityByAction.pop() if ui.undoQuantityByAction[ui.undoQuantityByAction.length-1] == 0
  undoQuantityByAction = ui.undoQuantityByAction[ui.undoQuantityByAction.length-1]

  for i in [0...undoQuantityByAction]
    operationToUndo = ui.undoStack[ui.undoStack.length-1]
    applyOperation operationToUndo.clone(), 'undo', true

    ui.undoStack.pop()
    ui.redoStack.push operationToUndo.invert()

  if ui.undoTimeout?
    clearTimeout ui.undoTimeout
    ui.undoTimeout = null

  ui.redoQuantityByAction.push ui.undoQuantityByAction[ui.undoQuantityByAction.length-1]
  ui.undoQuantityByAction[ui.undoQuantityByAction.length-1] = 0
  return

onRedo = ->
  return if ui.redoStack.length == 0

  redoQuantityByAction = ui.redoQuantityByAction[ui.redoQuantityByAction.length-1]
  for i in [0...redoQuantityByAction]
    operationToRedo = ui.redoStack[ui.redoStack.length-1]
    applyOperation operationToRedo.clone(), 'undo', true

    ui.redoStack.pop()
    ui.undoStack.push operationToRedo.invert()

  if ui.undoTimeout?
    clearTimeout ui.undoTimeout
    ui.undoTimeout = null

    ui.undoQuantityByAction.push ui.redoQuantityByAction[ui.redoQuantityByAction.length-1]
  else
    ui.undoQuantityByAction[ui.undoQuantityByAction.length-1] = ui.redoQuantityByAction[ui.redoQuantityByAction.length-1]

  ui.undoQuantityByAction.push 0
  ui.redoQuantityByAction.pop()
  return

# Start
start()
