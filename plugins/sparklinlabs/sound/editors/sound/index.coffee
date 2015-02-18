SoundAsset = SupCore.api.assetPlugins.sound

qs = require('querystring').parse window.location.search.slice(1)
info = { projectId: qs.project, assetId: qs.asset }
data = null
ui = {}
socket = null

start = ->
  socket = SupClient.connect info.projectId
  socket.on 'connect', onConnected
  socket.on 'disconnect', SupClient.onDisconnected
  socket.on 'edit:assets', onAssetEdited
  socket.on 'trash:assets', SupClient.onAssetTrashed

  # Upload
  fileSelect = document.querySelector('input.file-select')
  fileSelect.addEventListener 'change', onFileSelectChange
  document.querySelector('button.upload').addEventListener 'click', => fileSelect.click(); return

  # Sidebar
  ui.streamingSelect = document.querySelector('.property-streaming')
  ui.streamingSelect.addEventListener 'change', (event) =>
    socket.emit 'edit:assets', info.assetId, 'setProperty', 'streaming', event.target.value == 'true', (err) -> if err? then alert err; return

  return

# Network callbacks
onConnected = ->
  data = {}
  socket.emit 'sub', 'assets', info.assetId, onAssetReceived
  return

onAssetReceived = (err, asset) ->
  data.asset = new SoundAsset asset

  setupSound()
  setupProperty 'streaming', data.asset.pub.streaming
  return

onAssetEdited = (id, command, args...) ->
  data.asset.__proto__["client_#{command}"].apply data.asset, args
  onAssetCommands[command]?.apply data.asset, args
  return

onAssetCommands = {}

# User interface
onFileSelectChange = (event) ->
  return if event.target.files.length == 0

  reader = new FileReader
  reader.onload = (event) ->
    socket.emit 'edit:assets', info.assetId, 'upload', event.target.result, (err) ->
      if err? then alert err; return

  reader.readAsArrayBuffer event.target.files[0]
  event.target.parentElement.reset()
  return

objectURL = null
setupSound = ->
  URL.revokeObjectURL objectURL if objectURL?

  typedArray = new Uint8Array data.asset.pub.sound
  blob = new Blob [ typedArray ], type: 'audio'
  objectURL = URL.createObjectURL blob
  document.querySelector('audio').src = objectURL
  return

setupProperty = (path, value) ->
  switch path
    when 'streaming' then ui.streamingSelect.value = value
  return

onAssetCommands.upload = setupSound
onAssetCommands.setProperty = setupProperty

# Start
start()
