ScriptAsset = SupCore.api.assetPlugins.script

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
      'Tab': (cm) ->
        if cm.getSelection() != ""
          cm.execCommand 'indentMore'
        else
          cm.replaceSelection Array(cm.getOption("indentUnit") + 1).join " "
        return

      'Ctrl-S': ->
        socket.emit 'edit:assets', info.assetId, 'saveText', (err) -> if err? then alert err; SupClient.onDisconnected(); return
        return

  textArea = document.querySelector('.code-editor')
  ui.editor = CodeMirror.fromTextArea textArea,
    lineNumbers: true, matchBrackets: true, styleActiveLine: true, autoCloseBrackets: true
    tabSize: 2, keyMap: 'sublime' # , theme: 'monokai'
    extraKeys: extraKeys
    viewportMargin: Infinity
    mode: 'text/typescript'

  ui.tmpDoc = new CodeMirror.Doc ""
  ui.texts = []

  ui.editor.on 'beforeChange', (instance, change) =>
    return if change.origin in ['setValue', 'network']
    ui.texts.push ui.editor.getValue()
    return

  ui.editor.on 'changes', onEditText

# Network callbacks
onWelcome = (clientId) ->
  data = { clientId }
  socket.emit 'sub', 'assets', info.assetId, onAssetReceived
  return

onAssetReceived = (err, asset) ->
  data.asset = new ScriptAsset asset

  ui.editor.setValue data.asset.pub.draft
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

  if ui.sentOperation?
    operationToTransformFrom = ui.sentOperation.clone()
    if ui.pendingOperation?
      operationToTransformFrom = operationToTransformFrom.compose ui.pendingOperation

    [operationPrime, operationToTransformFromPrime] = operation.transform operationToTransformFrom
    ops = operationPrime.ops
  else
    ops = operation.ops

  cursorPosition = 0
  line = 0
  for op in ops
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
        ui.editor.replaceRange op.attributes.text, { line, ch: cursorPosition }, null, 'network'

        if line == cursor.line and cursorPosition == cursor.ch
          if ! operation.gotPriority data.clientId
            ui.editor.execCommand 'goCharLeft' for i in [0 ... op.attributes.text.length ]

        cursorPosition += op.attributes.text.length

      when 'delete'
        texts = op.attributes.text.split '\n'

        for text, textIndex in texts
          if texts[textIndex + 1]?
            ui.editor.replaceRange '', { line, ch: cursorPosition }, { line: line + 1, ch: 0 }, 'network'
          else
            ui.editor.replaceRange '', { line, ch: cursorPosition }, { line, ch: cursorPosition + text.length }, 'network'


  # Transform local changes with new inserted text
  if ui.sentOperation?
    [ui.sentOperation, operationPrime] = ui.sentOperation.transform operation

    if ui.pendingOperation?
      [ui.pendingOperation, operationPrime2] = ui.pendingOperation.transform operationPrime

  return

# User interface
onEditText = (instance, changes) ->
  for change, changeIndex in changes
    # Modification from an other person
    continue if change.origin in ['setValue', 'network']

    ui.tmpDoc.setValue ui.texts[changeIndex]

    operation = new OT.TextOperation data.clientId
    for line in [0...change.from.line]
      operation.retain ui.tmpDoc.getLine(line).length + 1
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
    operation.retain ui.tmpDoc.getValue().length - beforeLength - offset

    if ! operationToSend?
      operationToSend = operation.clone()
    else
      operationToSend = operationToSend.compose operation

  ui.texts.length = 0
  return if ! operationToSend?

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
