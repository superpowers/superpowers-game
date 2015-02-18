TileMapAsset = SupCore.api.assetPlugins.tileMap
TileMap = require '../../components/TileMap'
TileMapRenderer = SupEngine.componentPlugins.TileMapRenderer

TileSetAsset = SupCore.api.assetPlugins.tileSet
TileSet = require '../../components/TileSet'
TileSetRenderer = SupEngine.componentPlugins.TileSetRenderer

TreeView = require 'dnd-tree-view'
_ = require 'lodash'

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

  ui.mapArea = {}
  ui.mapArea.gameInstance = new SupEngine.GameInstance document.querySelector('canvas.map')
  ui.mapArea.gameInstance.threeRenderer.setClearColor 0xbbbbbb
  ui.mapArea.gameInstance.update()
  ui.mapArea.gameInstance.draw()

  ui.tileSetArea = {}
  ui.tileSetArea.image = new Image
  ui.tileSetArea.gameInstance = new SupEngine.GameInstance document.querySelector('canvas.tileSet')
  ui.tileSetArea.gameInstance.threeRenderer.setClearColor 0xbbbbbb
  ui.tileSetArea.gameInstance.update()
  ui.tileSetArea.gameInstance.draw()

  # Sidebar
  ui.tileSetInput = document.querySelector('.property-tileSetId')
  ui.tileSetInput.addEventListener 'input', onTileSetChange
  ui.tileSetInput.addEventListener 'keyup', (event) => event.stopPropagation(); return

  ui.widthLabel = document.querySelector('.property-width')
  ui.heightLabel = document.querySelector('.property-height')
  document.querySelector('button.resize').addEventListener 'click', onResizeMapClick
  document.querySelector('button.move').addEventListener 'click', onMoveMapClick

  ui.allSettings = ['pixelsPerUnit', 'layerDepthOffset']
  ui.settings = {}
  for setting in ui.allSettings
    parts = setting.split '.'

    obj = ui.settings
    queryName = '.property-'

    for part in parts.slice(0, parts.length - 1)
      obj[part] ?= {}
      obj = obj[part]
      queryName += "#{part}-"

    queryName += parts[parts.length - 1]
    settingObj = obj[parts[parts.length - 1]] = document.querySelector queryName

    do (setting) ->
      settingObj.addEventListener 'input', (event) =>
        socket.emit 'edit:assets', info.assetId, 'setProperty', setting, parseInt(event.target.value), (err) -> if err? then alert err; return

  ui.gridCheckbox = document.querySelector('input.grid-checkbox')
  ui.gridCheckbox.addEventListener 'change', onChangeGridDisplay
  ui.highlightCheckbox = document.querySelector('input.highlight-checkbox')
  ui.highlightCheckbox.addEventListener 'change', onChangeHighlight
  ui.highlightSlider = document.querySelector('input.highlight-slider')
  ui.highlightSlider.addEventListener 'input', onChangeHighlight

  ui.brushToolButton = document.querySelector('input#Brush')
  ui.brushToolButton.addEventListener 'change', => selectBrush(); return
  ui.selectionToolButton = document.querySelector('input#Selection')
  ui.selectionToolButton.addEventListener 'change', => selectSelection(); return
  ui.eraserToolButton = document.querySelector('input#Eraser')
  ui.eraserToolButton.addEventListener 'change', => selectEraser(); return

  ui.layersTreeView = new TreeView document.querySelector('.layers-tree-view'), onLayerDrop
  ui.layersTreeView.on 'selectionChange', onLayerSelect

  document.querySelector('button.new-layer').addEventListener 'click', onNewLayerClick
  document.querySelector('button.rename-layer').addEventListener 'click', onRenameLayerClick
  document.querySelector('button.delete-layer').addEventListener 'click', onDeleteLayerClick
  return

# Network callbacks
onConnected = ->
  data = {}
  socket.emit 'sub', 'assets', info.assetId, onAssetReceived
  socket.emit 'sub', 'entries', null, onEntriesReceived
  return

onAssetReceived = (err, asset) ->
  data.asset = new TileMapAsset asset

  onAssetCommands.changeTileSet()
  ui.widthLabel.textContent = data.asset.pub.width
  ui.heightLabel.textContent = data.asset.pub.height

  for setting in ui.allSettings
    parts = setting.split '.'
    obj = data.asset.pub
    obj = obj[part] for part in parts.slice(0, parts.length - 1)
    onAssetCommands.setupProperty setting, obj[parts[parts.length - 1]]

  setupLayer layer, index for layer, index in data.asset.pub.layers

  ui.tileSetArea.selectedLayerId = data.asset.pub.layers[0].id.toString()
  ui.layersTreeView.addToSelection ui.layersTreeView.treeRoot.querySelector("li[data-id='#{data.asset.pub.layers[0].id}']")
  return

onAssetEdited = (id, command, args...) ->
  switch id
    when info.assetId
      socket.emit 'unsub', 'assets', data.asset.pub.tileSetId if command == 'changeTileSet'

      data.asset.__proto__["client_#{command}"].call data.asset, args...
      onAssetCommands[command]?.apply data.asset, args

    when data.asset.pub.tileSetId.toString()
      data.mapTileSet.__proto__["client_#{command}"].call data.mapTileSet, args...
      data.tileSet.__proto__["client_#{command}"].call data.tileSet, args...

      switch command
        when 'upload' then onTileSetReceived()
        when 'setProperty'
          refreshMapArea()
          ui.mapArea.gridRenderer.setRatio data.asset.pub.pixelsPerUnit / data.mapTileSet.pub.gridSize
          refreshTileSetArea()

  return

# Tile map network callbacks
onAssetCommands = {}

onAssetCommands.changeTileSet = ->
  return if ! data.asset?
  return if ! data.entries?
  return if ! data.asset.pub.tileSetId?

  ui.tileSetInput.value = data.entries.getPathFromId data.asset.pub.tileSetId
  socket.emit 'sub', 'assets', data.asset.pub.tileSetId, onTileSetReceived
  return

onAssetCommands.resizeMap = ->
  ui.widthLabel.textContent = data.asset.pub.width
  ui.heightLabel.textContent = data.asset.pub.height

  refreshMapArea()
  ui.mapArea.gridRenderer.resize data.asset.pub.width, data.asset.pub.height
  return

onAssetCommands.moveMap = ->
  refreshMapArea()
  return

onAssetCommands.setupProperty = (path, value) ->
  parts = path.split '.'

  obj = ui.settings
  obj = obj[part] for part in parts.slice(0, parts.length - 1)
  obj[parts[parts.length - 1]].value = value
  return

onAssetCommands.editMap = (layerId, x, y) ->
  index = data.asset.pub.layers.indexOf(data.asset.layers.byId[layerId])
  ui.mapArea.tileMapRenderer.refreshTileAt index, x, y
  return

onAssetCommands.newLayer = (layer, index) ->
  ui.mapArea.tileMapRenderer.addLayer layer, index
  setupLayer layer, index
  return

setupLayer = (layer, index) ->
  liElt = document.createElement('li')
  liElt.dataset.id = layer.id

  displayCheckbox = document.createElement('input')
  displayCheckbox.className = 'display'
  displayCheckbox.type = 'checkbox'
  displayCheckbox.checked = true
  displayCheckbox.addEventListener 'change', => ui.mapArea.tileMapRenderer.layerMeshesById[layer.id].visible = displayCheckbox.checked; return

  displayCheckbox.addEventListener 'click', (event) =>
    event.stopPropagation()

  liElt.appendChild displayCheckbox

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = layer.name
  liElt.appendChild nameSpan

  ui.layersTreeView.insertAt liElt, 'item', index
  return

onAssetCommands.renameLayer = (id, newName) ->
  layerElt = ui.layersTreeView.treeRoot.querySelector("[data-id='#{id}']")
  layerElt.querySelector('.name').textContent = newName
  return

onAssetCommands.deleteLayer = (id, index) ->
  layerElt = ui.layersTreeView.treeRoot.querySelector("[data-id='#{id}']")
  ui.layersTreeView.remove layerElt

  ui.mapArea.tileMapRenderer.deleteLayer index

  if id == parseInt(ui.tileSetArea.selectedLayerId)
    index = Math.max 0, index-1
    ui.tileSetArea.selectedLayerId = data.asset.pub.layers[index].id
    ui.layersTreeView.clearSelection()
    ui.layersTreeView.addToSelection ui.layersTreeView.treeRoot.querySelector("li[data-id='#{ui.tileSetArea.selectedLayerId}']")
  return

onAssetCommands.moveLayer = (id, newIndex) ->
  layerElt = ui.layersTreeView.treeRoot.querySelector("[data-id='#{id}']")
  ui.layersTreeView.insertAt layerElt, 'item', newIndex

  ui.mapArea.tileMapRenderer.moveLayer id, newIndex
  return

# Entries network callbacks
onEntriesReceived = (err, entries) ->
  data.entries = new SupCore.api.Entries entries

  onAssetCommands.changeTileSet()

  socket.on 'add:entries', onEntryAdded
  socket.on 'move:entries', onEntryMoved
  socket.on 'setProperty:entries', onSetEntryProperty
  socket.on 'trash:entries', onEntryTrashed
  return

onEntryAdded = (entry, parentId, index) ->
  data.entries.client_add entry, parentId, index
  return

onEntryMoved = (id, parentId, index) ->
  data.entries.client_move id, parentId, index
  return

onSetEntryProperty = (id, key, value) ->
  data.entries.client_setProperty id, key, value

  if id == data.asset.pub.tileSetId and key == 'name'
    ui.tileSetInput.value = value
  return

onEntryTrashed = (id) ->
  data.entries.client_remove id

  if id == data.asset.pub.tileSetId
    console.log 'current tileset has been trashed!'

  return

# Tile set network callbacks
imageObjectURL = null
onTileSetReceived = (err, tileSet) ->
  URL.revokeObjectURL imageObjectURL if imageObjectURL?

  if tileSet?
    data.mapTileSet = new TileSetAsset tileSet
    data.tileSet = new TileSetAsset _.cloneDeep(tileSet)

  typedArray = new Uint8Array data.mapTileSet.pub.image
  blob = new Blob [ typedArray ], type: 'image/*'
  imageObjectURL = URL.createObjectURL blob

  ui.image.src = imageObjectURL
  ui.image.addEventListener 'load', ->
    mapTexture = data.mapTileSet.pub.texture = new SupEngine.THREE.Texture ui.image
    mapTexture.needsUpdate = true
    mapTexture.magFilter = SupEngine.THREE.NearestFilter
    mapTexture.minFilter = SupEngine.THREE.NearestFilter

    texture = data.tileSet.pub.texture = new SupEngine.THREE.Texture ui.image
    texture.needsUpdate = true
    texture.magFilter = SupEngine.THREE.NearestFilter
    texture.minFilter = SupEngine.THREE.NearestFilter

    setupEditor() if ! ui.requestAnimationId?
    refreshMapArea()
    refreshTileSetArea()
    return
  return

setupEditor = ->
  setupMapArea()
  setupTileSetArea()

  # Keybindings
  document.addEventListener 'keyup', (event) ->
    switch event.keyCode
      when window.KeyEvent.DOM_VK_B then selectBrush()
      when window.KeyEvent.DOM_VK_S then selectSelection()
      when window.KeyEvent.DOM_VK_E then selectEraser()
      when window.KeyEvent.DOM_VK_G then ui.gridCheckbox.checked = ! ui.gridCheckbox.checked; onChangeGridDisplay()
      when window.KeyEvent.DOM_VK_H then ui.highlightCheckbox.checked = ! ui.highlightCheckbox.checked; onChangeHighlight()
      when window.KeyEvent.DOM_VK_F then flipTilesHorizontally()
      when window.KeyEvent.DOM_VK_V then flipTilesVertically()
      when window.KeyEvent.DOM_VK_R then rotateTiles()
    return
  ui.requestAnimationId = requestAnimationFrame draw
  return

# User interface
setupMapArea = ->
  scaleRatio = 1 / data.asset.pub.pixelsPerUnit

  ui.mapArea.tileMapActor = new SupEngine.Actor ui.mapArea.gameInstance, "TileMap"
  ui.mapArea.tileMapRenderer = new TileMapRenderer ui.mapArea.tileMapActor

  # Camera
  cameraActor = new SupEngine.Actor ui.mapArea.gameInstance, "Camera"
  cameraPosition = new SupEngine.THREE.Vector3 0, 0, 100
  cameraPosition.setX data.asset.pub.width / 2 * data.mapTileSet.pub.gridSize * scaleRatio
  cameraPosition.setY data.asset.pub.height / 2 * data.mapTileSet.pub.gridSize * scaleRatio, 1
  cameraActor.setLocalPosition cameraPosition
  ui.mapArea.cameraComponent = new SupEngine.componentPlugins.Camera cameraActor
  ui.mapArea.cameraComponent.setOrthographicMode true
  new SupEngine.componentPlugins.Camera2DControls cameraActor, ui.mapArea.cameraComponent, {
    zoomOffset: 2
    zoomMin: 1
    zoomMax: 100
  }, => ui.mapArea.gridRenderer.setOrthgraphicScale(ui.mapArea.cameraComponent.orthographicScale); return

  # Grid
  ui.mapArea.gridActor = new SupEngine.Actor ui.mapArea.gameInstance, "Grid"
  ui.mapArea.gridActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 90
  ui.mapArea.gridRenderer = new SupEngine.componentPlugins.GridRenderer ui.mapArea.gridActor, {
    width: data.asset.pub.width
    height: data.asset.pub.height
    orthographicScale: ui.mapArea.cameraComponent.orthographicScale
    ratio: data.asset.pub.pixelsPerUnit / data.mapTileSet.pub.gridSize
  }

  # Pattern
  ui.mapArea.patternActor = new SupEngine.Actor ui.mapArea.gameInstance, "Pattern"

  ui.mapArea.patternBackgroundActor = new SupEngine.Actor ui.mapArea.gameInstance, "Pattern Background"
  patternBackgroundRenderer = new SupEngine.componentPlugins.FlatColorRenderer ui.mapArea.patternBackgroundActor, "#900090", scaleRatio, data.mapTileSet.pub.gridSize

  ui.mapArea.duplicatingSelection = false
  return

setupPattern = (layerData, width=1)->
  ui.mapArea.gameInstance.destroyComponent ui.mapArea.patternRenderer if ui.mapArea.patternRenderer?

  patternData =
    width: width, height: layerData.length / width
    pixelsPerUnit: data.asset.pub.pixelsPerUnit
    layerDepthOffset: data.asset.pub.layerDepthOffset
    layers: [ data: layerData ]

  patternTileMap = new TileMap patternData
  patternTileSet = new TileSet data.mapTileSet.pub
  ui.mapArea.patternRenderer = new TileMapRenderer ui.mapArea.patternActor, patternTileMap, patternTileSet
  return

refreshMapArea = ->
  ui.mapArea.tileMapRenderer.setTileMap new TileMap data.asset.pub
  ui.mapArea.tileMapRenderer.setTileSet new TileSet data.mapTileSet.pub

  setupPattern [ [ 0, 0, false, false, 0 ] ]
  return

setupTileSetArea = ->
  cameraActor = new SupEngine.Actor ui.tileSetArea.gameInstance, "Camera"
  cameraActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 1
  ui.tileSetArea.cameraComponent = new SupEngine.componentPlugins.Camera cameraActor
  ui.tileSetArea.cameraComponent.setOrthographicMode true
  new SupEngine.componentPlugins.Camera2DControls cameraActor, ui.tileSetArea.cameraComponent, {
    zoomOffset: 2
    zoomMin: 1
    zoomMax: 50
  }

  # Tile set
  ui.tileSetArea.tileSetActor = new SupEngine.Actor ui.tileSetArea.gameInstance, "TileSet"
  ui.tileSetArea.tileSetRenderer = new TileSetRenderer ui.tileSetArea.tileSetActor

  # Selected tile
  scaleRatio = 1 / data.asset.pub.pixelsPerUnit
  ui.tileSetArea.selectedTileActor = new SupEngine.Actor ui.tileSetArea.gameInstance, "SelectedTile"
  selectedTileRenderer = new SupEngine.componentPlugins.FlatColorRenderer ui.tileSetArea.selectedTileActor, "#900090", scaleRatio, data.mapTileSet.pub.gridSize
  ui.tileSetArea.selectedTileMesh = selectedTileRenderer.mesh
  return

refreshTileSetArea = ->
  scaleRatio = 1 / data.asset.pub.pixelsPerUnit

  # Tile set
  ui.tileSetArea.tileSetRenderer.setTileSet new TileSet(data.tileSet.pub), scaleRatio

  # Selected tile
  ui.tileSetArea.selectedTileMesh.scale.set scaleRatio, scaleRatio, scaleRatio
  ui.tileSetArea.selectedTileMesh.position.setX data.mapTileSet.pub.gridSize / 2 * scaleRatio
  ui.tileSetArea.selectedTileMesh.position.setY -data.mapTileSet.pub.gridSize / 2 * scaleRatio
  ui.tileSetArea.selectedTileMesh.updateMatrixWorld()

  ui.tileSetArea.selectedTileActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 0.5
  ui.tileSetArea.selectedTileActor.setLocalScale new SupEngine.THREE.Vector3 1, 1, 1

  ui.tileSetArea.selectedTileActor.threeObject.add ui.tileSetArea.selectedTileMesh

  ui.tileSet = {}
  ui.tileSet.tilesPerRow = ui.image.width / data.tileSet.pub.gridSize
  ui.tileSet.tilesPerColumn = ui.image.height / data.tileSet.pub.gridSize
  return

onTileSetChange = (event) ->
  entry = SupClient.findEntryByPath data.entries.pub, event.target.value

  if entry?.type == 'tileSet'
    socket.emit 'edit:assets', info.assetId, 'changeTileSet', entry.id, (err) -> if err? then alert err; return
  return

onResizeMapClick = ->
  width = prompt "New width", data.asset.pub.width
  height = prompt "New height", data.asset.pub.height
  return if (! width? or width == data.asset.pub.width) and (! height? or height == data.asset.pub.height)

  socket.emit 'edit:assets', info.assetId, 'resizeMap', parseInt(width), parseInt(height), (err) ->
    if err? then alert err; return
    return

onMoveMapClick = ->
  horizontalOffset = prompt "Horizontal offset", 0
  verticalOffset = prompt "Vertical offset", 0
  return if ! horizontalOffset? or ! verticalOffset? or (horizontalOffset == 0 and verticalOffset == 0)

  socket.emit 'edit:assets', info.assetId, 'moveMap', parseInt(horizontalOffset), parseInt(verticalOffset), (err) ->
    if err? then alert err; return
    return
  return

onNewLayerClick = ->
  name = prompt "Layer name", "Layer"
  return if ! name?

  socket.emit 'edit:assets', info.assetId, 'newLayer', name, SupClient.getTreeViewInsertionPoint(ui.layersTreeView).index , (err, layerId) ->
    if err? then alert err; return

    ui.layersTreeView.clearSelection()
    ui.layersTreeView.addToSelection ui.layersTreeView.treeRoot.querySelector("li[data-id='#{layerId}']")
    ui.tileSetArea.selectedLayerId = layerId
    return

onRenameLayerClick = ->
  return if ui.layersTreeView.selectedNodes.length != 1

  selectedNode = ui.layersTreeView.selectedNodes[0]
  layer = data.asset.layers.byId[parseInt(selectedNode.dataset.id)]

  newName = prompt "New name", layer.name
  return if ! newName?

  socket.emit 'edit:assets', info.assetId, 'renameLayer', layer.id, newName, (err) ->
    alert err if err?; return

onDeleteLayerClick = ->
  return if ui.layersTreeView.selectedNodes.length != 1
  return if ! confirm "Are you sure you want to delete the selected layer?"

  selectedNode = ui.layersTreeView.selectedNodes[0]
  socket.emit 'edit:assets', info.assetId, 'deleteLayer', parseInt(selectedNode.dataset.id), (err) ->
    alert err if err?; return

onLayerDrop = (dropInfo, orderedNodes) =>
  id = parseInt(orderedNodes[0].dataset.id)

  newIndex = SupClient.getListViewDropIndex dropInfo, data.asset.layers
  socket.emit 'edit:assets', info.assetId, 'moveLayer', id, newIndex, (err) ->
    if err? then alert err; return

  false

onLayerSelect = =>
  if ui.layersTreeView.selectedNodes.length != 1
    ui.layersTreeView.clearSelection()
    ui.layersTreeView.addToSelection ui.layersTreeView.treeRoot.querySelector("li[data-id='#{ui.tileSetArea.selectedLayerId}']")
  else
    ui.tileSetArea.selectedLayerId = ui.layersTreeView.selectedNodes[0].dataset.id

  onChangeHighlight()
  return

onChangeGridDisplay = =>
  if ui.gridCheckbox.checked
    ui.mapArea.gridActor.threeObject.visible = true
  else
    ui.mapArea.gridActor.threeObject.visible = false
  return

onChangeHighlight = =>
  for id, layerMesh of ui.mapArea.tileMapRenderer.layerMeshesById
    if ui.highlightCheckbox.checked and id != ui.tileSetArea.selectedLayerId
      layerMesh.material.opacity = ui.highlightSlider.value / 100
    else
      layerMesh.material.opacity = 1

  return

selectBrush = (x, y, width=1, height=1) ->
  ratio = data.asset.pub.pixelsPerUnit / data.tileSet.pub.gridSize
  if x? and y?
    ui.tileSetArea.selectedTileActor.setLocalPosition new SupEngine.THREE.Vector3 x/ratio, -y/ratio, 0.5
    ui.tileSetArea.selectedTileActor.setLocalScale new SupEngine.THREE.Vector3 width, height, 1

  else
    position = ui.tileSetArea.selectedTileActor.getLocalPosition()
    startX = position.x * ratio
    startY =  - position.y * ratio

    scale = ui.tileSetArea.selectedTileActor.getLocalScale()
    layerData = []
    for y in [scale.y - 1..0]
      for x in [0...scale.x]
        layerData.push [startX + x, startY + y, false, false, 0]

    setupPattern layerData, scale.x

  ui.brushToolButton.checked = true
  ui.mapArea.patternActor.threeObject.visible = true
  ui.tileSetArea.selectedTileActor.threeObject.visible = true
  ui.mapArea.patternBackgroundActor.threeObject.visible = true
  ui.mapArea.patternBackgroundActor.setLocalScale new SupEngine.THREE.Vector3 width, height, 1
  return

selectSelection = ->
  ui.selectionToolButton.checked = true
  ui.mapArea.patternActor.threeObject.visible = false
  ui.mapArea.patternBackgroundActor.threeObject.visible = false
  ui.tileSetArea.selectedTileActor.threeObject.visible = false

  ui.mapArea.selectionStartPoint = null
  return

selectEraser = ->
  ui.eraserToolButton.checked = true
  ui.mapArea.patternActor.threeObject.visible = false
  ui.tileSetArea.selectedTileActor.threeObject.visible = false
  ui.mapArea.patternBackgroundActor.threeObject.visible = true
  ui.mapArea.patternBackgroundActor.setLocalScale new SupEngine.THREE.Vector3 1, 1, 1
  return

# Drawing
draw = =>
  ui.requestAnimationId = requestAnimationFrame draw

  drawMap()
  drawTileSet()
  return

editMap = (x, y, tileValue) =>
  if x >= 0 and x < data.asset.pub.width and y >= 0 and y < data.asset.pub.height
    layer = data.asset.layers.byId[ui.tileSetArea.selectedLayerId]
    index = y * data.asset.pub.width + x

    if layer.data[index][0] != tileValue[0] or layer.data[index][1] != tileValue[1]
      socket.emit 'edit:assets', info.assetId, 'editMap', layer.id, x, y, tileValue, (err) -> if err? then alert err; return
  return

flipTilesHorizontally = ->
  return if ! ui.mapArea.patternActor.threeObject.visible

  width = ui.mapArea.patternRenderer.tileMap.data.width
  height = ui.mapArea.patternRenderer.tileMap.data.height
  layerData = []
  for y in [0...height]
    for x in [width-1..0]
      tileValue = ui.mapArea.patternRenderer.tileMap.data.layers[0].data[y * width +  + x]
      tileValue[2] = ! tileValue[2]
      layerData.push tileValue

  setupPattern layerData, width

flipTilesVertically = ->
  return if ! ui.mapArea.patternActor.threeObject.visible

  width = ui.mapArea.patternRenderer.tileMap.data.width
  height = ui.mapArea.patternRenderer.tileMap.data.height
  layerData = []
  for y in [height-1..0]
    for x in [0...width]
      tileValue = ui.mapArea.patternRenderer.tileMap.data.layers[0].data[y * width +  + x]
      tileValue[3] = ! tileValue[3]

      layerData.push tileValue

  setupPattern layerData, width
  return

rotateTiles = ->
  return if ! ui.mapArea.patternActor.threeObject.visible

  width = ui.mapArea.patternRenderer.tileMap.data.width
  height = ui.mapArea.patternRenderer.tileMap.data.height
  layerData = []
  for x in [0...width]
    for y in [height-1..0]
      tileValue = ui.mapArea.patternRenderer.tileMap.data.layers[0].data[y * width +  + x]
      tileValue[4] += 90
      tileValue[4] = 0 if tileValue[4] == 360

      layerData.push tileValue

  setupPattern layerData, width
  return

drawMap = ->
  ui.mapArea.gameInstance.update()

  [mouseX, mouseY] = getGridPosition ui.mapArea.gameInstance, ui.mapArea.cameraComponent
  # Correct y: origin is BOTTOM left
  mouseY = -mouseY - 1

  # Edit tiles
  if ui.mapArea.gameInstance.input.mouseButtons[0].isDown
    if ui.eraserToolButton.checked
      editMap mouseX, mouseY, TileMapAsset.emptyTile

    else if ui.mapArea.patternActor.threeObject.visible

      for tileValue, tileIndex in ui.mapArea.patternRenderer.tileMap.data.layers[0].data
        x = mouseX + tileIndex % ui.mapArea.patternRenderer.tileMap.data.width
        y = mouseY + Math.floor(tileIndex / ui.mapArea.patternRenderer.tileMap.data.width)

        editMap x, y, tileValue

      if ui.selectionToolButton.checked and ! ui.mapArea.duplicatingSelection
        ui.mapArea.patternActor.threeObject.visible = false
        ui.mapArea.patternBackgroundActor.threeObject.visible = false

  # Quick switch to Brush or Eraser
  if ui.mapArea.gameInstance.input.mouseButtons[2].wasJustReleased
    if ! ui.selectionToolButton.checked or ! ui.mapArea.patternBackgroundActor.threeObject.visible
      if mouseX >= 0 and mouseX < data.asset.pub.width and mouseY >= 0 and mouseY < data.asset.pub.height
        layer = data.asset.layers.byId[ui.tileSetArea.selectedLayerId]
        tile = layer.data[mouseY * data.asset.pub.width + mouseX]
        if tile[0] == -1
          selectEraser()
        else
          setupPattern [tile]
          selectBrush tile[0], tile[1]

    else
      ui.mapArea.selectionStartPoint = null
      ui.mapArea.patternBackgroundActor.threeObject.visible = false
      ui.mapArea.patternActor.threeObject.visible = false
      ui.mapArea.duplicatingSelection = false

  if ui.mapArea.patternActor.threeObject.visible or ui.eraserToolButton.checked
    x = Math.max(0, Math.min(data.asset.pub.width - 1, mouseX))
    y = Math.max(0, Math.min(data.asset.pub.height - 1, mouseY))

    ratio = data.asset.pub.pixelsPerUnit / data.tileSet.pub.gridSize
    patternPosition = new SupEngine.THREE.Vector3 x/ratio, y/ratio, data.asset.layers.pub.length * data.asset.pub.layerDepthOffset
    ui.mapArea.patternActor.setLocalPosition patternPosition
    ui.mapArea.patternBackgroundActor.setLocalPosition patternPosition

  # Selection
  if ui.selectionToolButton.checked

    if ui.mapArea.gameInstance.input.mouseButtons[0].wasJustPressed
      # A pattern is already in the buffer
      if ! ui.mapArea.patternActor.threeObject.visible
        if mouseX >= 0 and mouseX < data.asset.pub.width and mouseY >= 0 and mouseY < data.asset.pub.height
          ui.mapArea.patternBackgroundActor.threeObject.visible = true
          ui.mapArea.selectionStartPoint = { x: mouseX, y: mouseY }

        else
          ui.mapArea.selectionStartPoint = null
          ui.mapArea.patternActor.threeObject.visible = false
          ui.mapArea.patternBackgroundActor.threeObject.visible = false

    if ui.mapArea.selectionStartPoint?
      if ui.mapArea.gameInstance.input.mouseButtons[0].isDown
        # Clamp mouse values
        x = Math.max(0, Math.min(data.asset.pub.width - 1, mouseX))
        y = Math.max(0, Math.min(data.asset.pub.height - 1, mouseY))

        ui.mapArea.selectionEndPoint = { x, y }

      startX = Math.min ui.mapArea.selectionStartPoint.x, ui.mapArea.selectionEndPoint.x
      startY = Math.min ui.mapArea.selectionStartPoint.y, ui.mapArea.selectionEndPoint.y
      width = Math.abs(ui.mapArea.selectionEndPoint.x - ui.mapArea.selectionStartPoint.x) + 1
      height = Math.abs(ui.mapArea.selectionEndPoint.y - ui.mapArea.selectionStartPoint.y) + 1

      if ui.mapArea.gameInstance.input.mouseButtons[0].isDown
        ratio = data.asset.pub.pixelsPerUnit / data.tileSet.pub.gridSize
        patternPosition = new SupEngine.THREE.Vector3 startX/ratio, startY/ratio, data.asset.layers.pub.length * data.asset.pub.layerDepthOffset
        ui.mapArea.patternBackgroundActor.setLocalPosition patternPosition
        ui.mapArea.patternBackgroundActor.setLocalScale new SupEngine.THREE.Vector3 width, height, 1

      # Delete selection
      else if ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_DELETE].wasJustReleased
        for y in [0...height]
          for x in [0...width]
            editMap startX + x, startY + y, TileMapAsset.emptyTile

        ui.mapArea.patternBackgroundActor.threeObject.visible = false
        ui.mapArea.selectionStartPoint = null

      # Move/duplicate the selection
      else if ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_M].wasJustReleased or
      ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_D].wasJustReleased
        layerData = []
        layer = data.asset.layers.byId[ui.tileSetArea.selectedLayerId]

        for y in [0...height]
          for x in [0...width]
            tile = layer.data[(startY + y) * data.asset.pub.width + startX + x]
            layerData.push tile

            if ! ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_D].wasJustReleased
              editMap startX + x, startY + y, TileMapAsset.emptyTile

        setupPattern layerData, width
        ui.mapArea.patternActor.threeObject.visible = true
        ui.mapArea.selectionStartPoint = null

        ui.mapArea.duplicatingSelection = ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_D].wasJustReleased

  ui.mapArea.gameInstance.draw()
  return

drawTileSet = ->
  ui.tileSetArea.gameInstance.update()

  [mouseX, mouseY] = getGridPosition ui.tileSetArea.gameInstance, ui.tileSetArea.cameraComponent
  if ui.tileSetArea.gameInstance.input.mouseButtons[0].wasJustPressed

    if mouseX >= 0 and mouseX < ui.tileSet.tilesPerRow and mouseY >= 0 and mouseY < ui.tileSet.tilesPerColumn
      ui.tileSetArea.selectionStartPoint = { x: mouseX, y: mouseY }
      selectBrush mouseX, mouseY

  else if ui.tileSetArea.gameInstance.input.mouseButtons[0].wasJustReleased and ui.tileSetArea.selectionStartPoint?
    # Clamp mouse values
    x = Math.max(0, Math.min(ui.tileSet.tilesPerRow - 1, mouseX))
    y = Math.max(0, Math.min(ui.tileSet.tilesPerColumn - 1, mouseY))

    startX = Math.min ui.tileSetArea.selectionStartPoint.x, x
    startY = Math.min ui.tileSetArea.selectionStartPoint.y, y
    width = Math.abs(x - ui.tileSetArea.selectionStartPoint.x) + 1
    height = Math.abs y - ui.tileSetArea.selectionStartPoint.y
    layerData = []
    for y in [height..0]
      for x in [0...width]
        layerData.push [startX + x, startY + y, false, false, 0]

    setupPattern layerData, width
    selectBrush startX, startY, width, height + 1
    ui.tileSetArea.selectionStartPoint = null

  if ui.tileSetArea.selectionStartPoint?
    # Clamp mouse values
    x = Math.max(0, Math.min(ui.tileSet.tilesPerRow - 1, mouseX))
    y = Math.max(0, Math.min(ui.tileSet.tilesPerColumn - 1, mouseY))

    width = x - ui.tileSetArea.selectionStartPoint.x
    if width >= 0
      width += 1
      x = ui.tileSetArea.selectionStartPoint.x
    else
      width -= 1
      x = ui.tileSetArea.selectionStartPoint.x + 1

    height = y - ui.tileSetArea.selectionStartPoint.y
    if height >= 0
      height += 1
      y = ui.tileSetArea.selectionStartPoint.y
    else
      height -= 1
      y = ui.tileSetArea.selectionStartPoint.y + 1

    ratio = data.asset.pub.pixelsPerUnit / data.tileSet.pub.gridSize
    ui.tileSetArea.selectedTileActor.setLocalPosition new SupEngine.THREE.Vector3 x/ratio, -y/ratio, 0.5
    ui.tileSetArea.selectedTileActor.setLocalScale new SupEngine.THREE.Vector3  width, height, 1

  ui.tileSetArea.gameInstance.draw()
  return

getGridPosition = (gameInstance, cameraComponent)->
  mousePosition = gameInstance.input.mousePosition
  position = new SupEngine.THREE.Vector3 mousePosition.x, mousePosition.y, 0
  cameraPosition = cameraComponent.actor.getLocalPosition()

  x = position.x / gameInstance.threeRenderer.domElement.width

  x = x * 2 - 1
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio
  x += cameraPosition.x
  x *= data.asset.pub.pixelsPerUnit / data.tileSet.pub.gridSize
  x = Math.floor(x)

  y = position.y / gameInstance.threeRenderer.domElement.height
  y = y * 2 - 1
  y *= cameraComponent.orthographicScale / 2
  y -= cameraPosition.y
  y *= data.asset.pub.pixelsPerUnit / data.tileSet.pub.gridSize
  y = Math.floor(y)
  return [x, y]

# Start
start()
