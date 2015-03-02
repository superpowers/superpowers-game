TileSetAsset = SupCore.data.assetPlugins.tileSet
TileSet = require '../../components/TileSet'
TileSetRenderer = SupEngine.editorComponents.TileSetRenderer

TreeView = require 'dnd-tree-view'

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

  # Drawing
  ui.image = new Image

  ui.gameInstance = new SupEngine.GameInstance document.querySelector('canvas')
  ui.gameInstance.threeRenderer.setClearColor 0xbbbbbb

  cameraActor = new SupEngine.Actor ui.gameInstance, "Camera"
  cameraActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 10
  ui.cameraComponent = new SupEngine.componentPlugins.Camera cameraActor
  ui.cameraComponent.setOrthographicMode true
  ui.cameraControls = new SupEngine.editorComponents.Camera2DControls cameraActor, ui.cameraComponent, {
    zoomOffset: 2
    zoomMin: 1
    zoomMax: 50
  }, => ui.gridRenderer.setOrthgraphicScale(ui.cameraComponent.orthographicScale); return

  ui.tileSetActor = new SupEngine.Actor ui.gameInstance, "Tile Set"
  ui.tileSetRenderer = new TileSetRenderer ui.tileSetActor

  ui.gridActor = new SupEngine.Actor ui.gameInstance, "Grid"
  ui.gridActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 1
  ui.gridRenderer = new SupEngine.editorComponents.GridRenderer ui.gridActor

  ui.selectedTileActor = new SupEngine.Actor ui.gameInstance, "Selection"
  ui.selectedTileActor.setLocalPosition new SupEngine.THREE.Vector3 0, -1, 2
  ui.selectedTileRenderer = new SupEngine.editorComponents.FlatColorRenderer ui.selectedTileActor
  ui.selectedTileRenderer.setup "#900090", 1, 1

  requestAnimationFrame draw

  # Sidebar
  fileSelect = document.querySelector('input.file-select')
  fileSelect.addEventListener 'change', onFileSelectChange
  document.querySelector('button.upload').addEventListener 'click', => fileSelect.click(); return

  document.querySelector('button.download').addEventListener 'click', onDownloadTileset

  ui.gridSizeInput = document.querySelector('input.grid-size')
  ui.gridSizeInput.addEventListener 'input', (event) =>
    socket.emit 'edit:assets', info.assetId, 'setProperty', 'gridSize', parseInt(event.target.value), (err) -> if err? then alert err; return

  # Tile properties
  ui.propertiesTreeView = new TreeView document.querySelector('.properties-tree-view'), => false
  ui.propertiesTreeView.on 'selectionChange', onPropertySelect
  document.querySelector('button.new-property').addEventListener 'click', onNewPropertyClick
  document.querySelector('button.rename-property').addEventListener 'click', onRenamePropertyClick
  document.querySelector('button.delete-property').addEventListener 'click', onDeletePropertyClick
  return


# Network callbacks
onConnected = ->
  data = {}
  socket.emit 'sub', 'assets', info.assetId, onAssetReceived
  return

onAssetReceived = (err, asset) ->
  data.asset = new TileSetAsset asset
  data.selectedTile = x: 0, y: 0

  setupImage()
  setupProperty 'gridSize', data.asset.pub.gridSize
  setupTileProperties data.selectedTile
  return

onAssetEdited = (id, command, args...) ->
  data.asset.__proto__["client_#{command}"].call data.asset, args...
  onAssetCommands[command]?.apply data.asset, args
  return

onAssetCommands =  {}

onAssetCommands.upload = -> setupImage(); return
onAssetCommands.setProperty = (key, value) -> setupProperty key, value; return

onAssetCommands.addTileProperty = (tile, name) ->
  return if tile.x != data.selectedTile.x and tile.y != data.selectedTile.y

  addTileProperty name
  return

onAssetCommands.renameTileProperty = (tile, name, newName) ->
  return if tile.x != data.selectedTile.x and tile.y != data.selectedTile.y

  liElt = ui.propertiesTreeView.treeRoot.querySelector("li[data-name='#{name}']")
  liElt.querySelector('.name').textContent = newName
  liElt.dataset.name = newName

  properties = Object.keys( data.asset.pub.tileProperties["#{tile.x}_#{tile.y}"])
  properties.sort()
  ui.propertiesTreeView.remove liElt
  ui.propertiesTreeView.insertAt liElt, 'item', properties.indexOf(newName)

  if ui.selectedProperty == name
    ui.selectedProperty = newName
    ui.propertiesTreeView.addToSelection liElt
  return

onAssetCommands.deleteTileProperty = (tile, name) ->
  return if tile.x != data.selectedTile.x and tile.y != data.selectedTile.y

  ui.propertiesTreeView.remove ui.propertiesTreeView.treeRoot.querySelector("li[data-name='#{name}']")
  return

onAssetCommands.editTileProperty = (tile, name, value) ->
  return if tile.x != data.selectedTile.x and tile.y != data.selectedTile.y

  liElt = ui.propertiesTreeView.treeRoot.querySelector("li[data-name='#{name}']")
  liElt.querySelector('.value').value = value
  return

imageObjectURL = null
setupImage = ->
  URL.revokeObjectURL imageObjectURL if imageObjectURL?

  typedArray = new Uint8Array data.asset.pub.image
  blob = new Blob [ typedArray ], type: 'image/*'
  imageObjectURL = URL.createObjectURL blob

  ui.image.src = imageObjectURL
  ui.image.onload = ->
    texture = data.asset.pub.texture = new SupEngine.THREE.Texture ui.image
    texture.needsUpdate = true
    texture.magFilter = SupEngine.THREE.NearestFilter
    texture.minFilter = SupEngine.THREE.NearestFilter
    ui.tileSetRenderer.setTileSet new TileSet(data.asset.pub), 1 / data.asset.pub.gridSize

    ui.gridRenderer.setGrid
      width: data.asset.pub.texture.image.width / data.asset.pub.gridSize
      height: data.asset.pub.texture.image.height / data.asset.pub.gridSize
      direction: -1
      orthographicScale: ui.cameraComponent.orthographicScale
      ratio: 1
    return
  return

setupProperty = (key, value) ->
  switch key
    when 'gridSize'
      ui.gridSizeInput.value = value

      if data.asset.pub.texture?
        ui.tileSetRenderer.setTileSet new TileSet(data.asset.pub), 1 / data.asset.pub.gridSize

        width = data.asset.pub.texture.image.width / data.asset.pub.gridSize
        height = data.asset.pub.texture.image.height / data.asset.pub.gridSize
        ui.gridRenderer.resize width, height
  return

setupTileProperties = (tile) ->
  while ui.propertiesTreeView.treeRoot.children.length != 0
    ui.propertiesTreeView.remove ui.propertiesTreeView.treeRoot.children[0]

  return if ! data.asset.pub.tileProperties["#{tile.x}_#{tile.y}"]?

  properties = Object.keys( data.asset.pub.tileProperties["#{tile.x}_#{tile.y}"])
  properties.sort()
  for propertyName in properties
    addTileProperty propertyName, data.asset.pub.tileProperties["#{tile.x}_#{tile.y}"][propertyName]
  return

addTileProperty = (name, value="") ->
  liElt = document.createElement('li')
  liElt.dataset.name = name

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = name
  liElt.appendChild nameSpan

  valueInput = document.createElement('input')
  valueInput.type = 'string'
  valueInput.className = 'value'
  valueInput.value = value
  valueInput.addEventListener 'input', =>
    socket.emit 'edit:assets', info.assetId, 'editTileProperty', data.selectedTile, ui.selectedProperty, valueInput.value, (err) ->
      if err? then alert err; return

  liElt.appendChild valueInput

  ui.propertiesTreeView.insertAt liElt, 'item'
  return

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

onDownloadTileset = (event) ->
  SupClient.dialogs.prompt "Enter a name for the image.", null, "Tile set", "Download", (name) =>
    return if ! name?

    a = document.createElement "a"
    document.body.appendChild a
    a.style = "display: none"
    a.href = imageObjectURL

    a.download = name + '.png'
    a.click()
    document.body.removeChild a
  return

onPropertySelect = =>
  if ui.propertiesTreeView.selectedNodes.length > 1
    ui.propertiesTreeView.clearSelection()
    ui.propertiesTreeView.addToSelection ui.propertiesTreeView.treeRoot.querySelector("li[data-name='#{ui.selectedProperty}']")

  else if ui.propertiesTreeView.selectedNodes.length == 1
    ui.selectedProperty = ui.propertiesTreeView.selectedNodes[0].dataset.name
    document.querySelector('button.rename-property').disabled = false
    document.querySelector('button.delete-property').disabled = false

  else
    ui.selectedProperty = null
    document.querySelector('button.rename-property').disabled = true
    document.querySelector('button.delete-property').disabled = true
  return

onNewPropertyClick = ->
  SupClient.dialogs.prompt "Enter a name for the property.", null, "property", "Create", (name) =>
    return if ! name?

    socket.emit 'edit:assets', info.assetId, 'addTileProperty', data.selectedTile, name, (err) -> if err? then alert err; return
    return
  return

onRenamePropertyClick = ->
  return if ui.propertiesTreeView.selectedNodes.length != 1

  SupClient.dialogs.prompt "Enter a new name for the property.", null, ui.selectedProperty, "Rename", (newName) =>
    return if ! newName?

    socket.emit 'edit:assets', info.assetId, 'renameTileProperty', data.selectedTile, ui.selectedProperty, newName, (err) -> if err? then alert err; return
    return
  return

onDeletePropertyClick = ->
  return if ! ui.selectedProperty?
  SupClient.dialogs.confirm "Are you sure you want to delete the selected property?", "Delete", (confirm) =>
    return if ! confirm

    socket.emit 'edit:assets', info.assetId, 'deleteTileProperty', data.selectedTile, ui.selectedProperty, (err) -> if err? then alert err; return
    return
  return

# Drawing
draw = ->
  requestAnimationFrame draw

  ui.gameInstance.update()

  if ui.gameInstance.input.mouseButtons[0].wasJustReleased
    [mouseX, mouseY] = ui.cameraControls.getMouseScenePosition()
    x = Math.floor mouseX
    y = Math.floor mouseY

    if x >= 0 and x < data.asset.pub.texture.image.width / data.asset.pub.gridSize and
    y >= 0 and y < data.asset.pub.texture.image.height / data.asset.pub.gridSize and
    (x != data.selectedTile.x or y != data.selectedTile.y)
      data.selectedTile.x = x
      data.selectedTile.y = y
      ui.selectedTileActor.setLocalPosition new SupEngine.THREE.Vector3 x, -(y+1), 2

      setupTileProperties data.selectedTile

  ui.gameInstance.draw()
  return

# Start
start()
