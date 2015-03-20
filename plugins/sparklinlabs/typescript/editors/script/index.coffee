ScriptAsset = SupCore.data.assetPlugins.script

CodeMirror = require 'codemirror'
require 'codemirror/addon/search/search'
require 'codemirror/addon/search/searchcursor'
require 'codemirror/addon/edit/closebrackets'
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

  extraKeys =
    'F9': ->
    'Tab': (cm) ->
      if cm.getSelection() != ""
        cm.execCommand 'indentMore'
      else
        cm.replaceSelection Array(cm.getOption("indentUnit") + 1).join " "
      return
    'Ctrl-Z': ->
      return if ui.undoStack.length == 0

      revisionIndex = ui.undoStack[ui.undoStack.length-1]
      operationToUndo = ui.clientDocument.operations[revisionIndex]
      ui.clientDocument.apply operationToUndo.clone().invert(), revisionIndex + 1

      newRevisionIndex = ui.clientDocument.operations.length-1
      newOperation = ui.clientDocument.operations[newRevisionIndex]
      applyOperation newOperation.clone(), 'undo', true

      ui.undoStack.pop()
      ui.redoStack.push newRevisionIndex
      return
    'Shift-Ctrl-Z': ->
      return if ui.redoStack.length == 0

      revisionIndex = ui.redoStack[ui.redoStack.length-1]
      operationToRedo = ui.clientDocument.operations[revisionIndex]
      ui.clientDocument.apply operationToRedo.clone().invert(), revisionIndex + 1

      newRevisionIndex = ui.clientDocument.operations.length-1
      newOperation = ui.clientDocument.operations[newRevisionIndex]
      applyOperation newOperation.clone(), 'redo', true

      ui.redoStack.pop()
      ui.undoStack.push newRevisionIndex
      return
    'Ctrl-S': ->
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

  ui.clientDocument = new OT.Document
  ui.undoStack = []
  ui.redoStack = []

  ui.editor.on 'beforeChange', (instance, change) =>
    return if change.origin in ['setValue', 'network']
    ui.texts.push ui.editor.getValue()
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

  ui.clientDocument.text = data.asset.pub.draft
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

  # Transform operation with local changes
  operation = new OT.TextOperation
  operation.deserialize operationData

  # Transform new ops with local changes
  if ui.sentOperation?
    operationToTransformFrom = ui.sentOperation.clone()
    if ui.pendingOperation?
      operationToTransformFrom = operationToTransformFrom.compose ui.pendingOperation

    [operationPrime, operationToTransformFromPrime] = operation.transform operationToTransformFrom
    operationToApply = operationPrime
  else
    operationToApply = operation

  applyOperation operationToApply.clone(), 'network', false
  ui.clientDocument.apply operationToApply, ui.clientDocument.operations.length

  # Transform local changes with new text
  if ui.sentOperation?
    [ui.sentOperation, operationPrime] = ui.sentOperation.transform operation

    if ui.pendingOperation?
      [ui.pendingOperation, operationPrime2] = ui.pendingOperation.transform operationPrime
  return

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
        ui.editor.replaceRange op.attributes.text, { line, ch: cursorPosition }, null, origin

        if line == cursor.line and cursorPosition == cursor.ch
          if ! operation.gotPriority data.clientId
            ui.editor.execCommand 'goCharLeft' for i in [0 ... op.attributes.text.length ]

        cursorPosition += op.attributes.text.length

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
  #console.log changes
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

  ui.texts.length = 0
  return if ! operationToSend?

  if changes[0].origin not in ['setValue', 'network', 'undo', 'redo']
    localOperation = operationToSend.clone()
    ui.undoStack.push ui.clientDocument.operations.length
    ui.clientDocument.apply localOperation, ui.clientDocument.operations.length
    ui.redoStack.length = 0

  if ! ui.sentOperation?
    socket.emit 'edit:assets', info.assetId, 'editText', operationToSend.serialize(), data.asset.document.operations.length, (err) ->
      if err? then alert err; SupClient.onDisconnected(); return

    ui.sentOperation = operationToSend
  else
    if ui.pendingOperation?
      ui.pendingOperation = ui.pendingOperation.compose operationToSend
    else
      ui.pendingOperation = operationToSend

# Start
start()
