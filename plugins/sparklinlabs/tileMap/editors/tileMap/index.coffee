TileMap = require '../../components/TileMap'
TileMapRenderer = SupEngine.componentClasses.TileMapRenderer

TileSet = require '../../components/TileSet'
TileSetRenderer = SupEngine.editorComponentClasses.TileSetRenderer

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
  SupClient.setupHotkeys()

  # Map Area
  ui.mapArea = {}
  ui.mapArea.gameInstance = new SupEngine.GameInstance document.querySelector('canvas.map')
  ui.mapArea.gameInstance.threeRenderer.setClearColor 0xbbbbbb
  ui.mapArea.gameInstance.update()
  ui.mapArea.gameInstance.draw()

  cameraActor = new SupEngine.Actor ui.mapArea.gameInstance, "Camera"
  cameraActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 100
  ui.mapArea.cameraComponent = new SupEngine.componentClasses.Camera cameraActor
  ui.mapArea.cameraComponent.setOrthographicMode true
  ui.mapArea.cameraControls = new SupEngine.editorComponentClasses.Camera2DControls cameraActor, ui.mapArea.cameraComponent, {
    zoomSpeed: 1.5
    zoomMin: 1
    zoomMax: 60
  }, => ui.mapArea.gridRenderer.setOrthgraphicScale(ui.mapArea.cameraComponent.orthographicScale); return

  ui.mapArea.gridActor = new SupEngine.Actor ui.mapArea.gameInstance, "Grid"
  ui.mapArea.gridActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 90
  ui.mapArea.gridRenderer = new SupEngine.editorComponentClasses.GridRenderer ui.mapArea.gridActor, {
    width: 1
    height: 1
    orthographicScale: ui.mapArea.cameraComponent.orthographicScale
    ratio: 1
  }

  ui.mapArea.patternActor = new SupEngine.Actor ui.mapArea.gameInstance, "Pattern"
  ui.mapArea.patternRenderer = new TileMapRenderer ui.mapArea.patternActor
  ui.mapArea.patternBackgroundActor = new SupEngine.Actor ui.mapArea.gameInstance, "Pattern Background"
  ui.mapArea.patternBackgroundRenderer = new SupEngine.editorComponentClasses.FlatColorRenderer ui.mapArea.patternBackgroundActor
  ui.mapArea.duplicatingSelection = false

  # Tile Set Area
  ui.tileSetArea = {}
  ui.tileSetArea.gameInstance = new SupEngine.GameInstance document.querySelector('canvas.tileSet')
  ui.tileSetArea.gameInstance.threeRenderer.setClearColor 0xbbbbbb
  ui.tileSetArea.gameInstance.update()
  ui.tileSetArea.gameInstance.draw()

  cameraActor = new SupEngine.Actor ui.tileSetArea.gameInstance, "Camera"
  cameraActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 10
  ui.tileSetArea.cameraComponent = new SupEngine.componentClasses.Camera cameraActor
  ui.tileSetArea.cameraComponent.setOrthographicMode true
  new SupEngine.editorComponentClasses.Camera2DControls cameraActor, ui.tileSetArea.cameraComponent, {
    zoomSpeed: 1.5
    zoomMin: 1
    zoomMax: 60
  }, => data.tileSetUpdater.tileSetRenderer.gridRenderer.setOrthgraphicScale(ui.tileSetArea.cameraComponent.orthographicScale); return

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
      settingObj.addEventListener 'change', (event) =>
        value = if setting == 'layerDepthOffset' then parseFloat(event.target.value) else parseInt(event.target.value)
        socket.emit 'edit:assets', info.assetId, 'setProperty', setting, value, (err) -> if err? then alert err; return

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

  requestAnimationFrame draw
  return

# Network callbacks
onConnected = ->
  data = {}
  data.projectClient = new SupClient.ProjectClient socket, subEntries: true

  tileMapActor = new SupEngine.Actor ui.mapArea.gameInstance, "Tile Map"
  tileMapRenderer = new TileMapRenderer tileMapActor
  config = tileMapAssetId: info.assetId, tileSetAssetId: null
  receiveCallbacks = tileMap: onTileMapAssetReceived, tileSet: onTileSetAssetReceived
  editCallbacks = tileMap: onEditCommands, tileSet: onTileSetEditCommands

  data.tileMapUpdater = new TileMapRenderer.Updater data.projectClient, tileMapRenderer, config, receiveCallbacks, editCallbacks
  return

onTileMapAssetReceived = ->
  pub = data.tileMapUpdater.tileMapAsset.pub

  tileSetActor = new SupEngine.Actor ui.tileSetArea.gameInstance, "Tile Set"
  tileSetRenderer = new TileSetRenderer tileSetActor
  config = tileSetAssetId: pub.tileSetId
  # tileSetProjectClient = new SupClient.ProjectClient socket, subEntries: false
  data.tileSetUpdater = new TileSetRenderer.Updater data.projectClient, tileSetRenderer, config

  updateTileSetInput()
  onEditCommands.resizeMap()

  for setting in ui.allSettings
    parts = setting.split '.'
    obj = pub
    obj = obj[part] for part in parts.slice(0, parts.length - 1)
    onEditCommands.setProperty setting, obj[parts[parts.length - 1]]

  setupLayer layer, index for layer, index in pub.layers

  ui.tileSetArea.selectedLayerId = pub.layers[0].id.toString()
  ui.layersTreeView.addToSelection ui.layersTreeView.treeRoot.querySelector("li[data-id='#{pub.layers[0].id}']")

  setupPattern [ [0, 0, false, false, 0] ]
  return

# Tile map network callbacks
onEditCommands = {}

updateTileSetInput = ->
  tileSetName =
    if data.tileMapUpdater.tileMapAsset.pub.tileSetId?
      data.projectClient.entries.getPathFromId data.tileMapUpdater.tileMapAsset.pub.tileSetId
    else
      ""
  ui.tileSetInput.value = tileSetName
  return

onEditCommands.changeTileSet = ->
  updateTileSetInput()
  data.tileSetUpdater.changeTileSetId data.tileMapUpdater.tileMapAsset.pub.tileSetId
  return

onEditCommands.resizeMap = ->
  ui.widthLabel.textContent = data.tileMapUpdater.tileMapAsset.pub.width
  ui.heightLabel.textContent = data.tileMapUpdater.tileMapAsset.pub.height
  ui.mapArea.gridRenderer.resize data.tileMapUpdater.tileMapAsset.pub.width, data.tileMapUpdater.tileMapAsset.pub.height
  return

onEditCommands.setProperty = (path, value) ->
  parts = path.split '.'

  obj = ui.settings
  obj = obj[part] for part in parts.slice(0, parts.length - 1)
  obj[parts[parts.length - 1]].value = value

  if path == "pixelsPerUnit" and data.tileMapUpdater.tileSetAsset?
    ui.mapArea.cameraControls.setMultiplier value / data.tileMapUpdater.tileSetAsset.pub.gridSize / 1

    ui.mapArea.gridRenderer.setRatio data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize
    ui.mapArea.patternRenderer.refreshPixelsPerUnit data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit
    ui.mapArea.patternBackgroundRenderer.refreshScale 1 / data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit
  return

onEditCommands.newLayer = (layer, index) ->
  setupLayer layer, index
  return

setupLayer = (layer, index) ->
  liElt = document.createElement('li')
  liElt.dataset.id = layer.id

  displayCheckbox = document.createElement('input')
  displayCheckbox.className = 'display'
  displayCheckbox.type = 'checkbox'
  displayCheckbox.checked = true
  displayCheckbox.addEventListener 'change', => data.tileMapUpdater.tileMapRenderer.layerMeshesById[layer.id].visible = displayCheckbox.checked; return

  displayCheckbox.addEventListener 'click', (event) =>
    event.stopPropagation()

  liElt.appendChild displayCheckbox

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = layer.name
  liElt.appendChild nameSpan

  ui.layersTreeView.insertAt liElt, 'item', index
  return

onEditCommands.renameLayer = (id, newName) ->
  layerElt = ui.layersTreeView.treeRoot.querySelector("[data-id='#{id}']")
  layerElt.querySelector('.name').textContent = newName
  return

onEditCommands.deleteLayer = (id, index) ->
  layerElt = ui.layersTreeView.treeRoot.querySelector("[data-id='#{id}']")
  ui.layersTreeView.remove layerElt

  if id == ui.tileSetArea.selectedLayerId
    index = Math.max 0, index-1
    ui.tileSetArea.selectedLayerId = data.tileMapUpdater.tileMapAsset.pub.layers[index].id
    ui.layersTreeView.clearSelection()
    ui.layersTreeView.addToSelection ui.layersTreeView.treeRoot.querySelector("li[data-id='#{ui.tileSetArea.selectedLayerId}']")
  return

onEditCommands.moveLayer = (id, newIndex) ->
  layerElt = ui.layersTreeView.treeRoot.querySelector("[data-id='#{id}']")
  ui.layersTreeView.insertAt layerElt, 'item', newIndex
  return

onTileSetAssetReceived = ->
  tileMapPub = data.tileMapUpdater.tileMapAsset.pub
  tileSetPub = data.tileMapUpdater.tileSetAsset.pub

  ui.mapArea.cameraControls.setMultiplier tileMapPub.pixelsPerUnit / tileSetPub.gridSize / 1
  ui.mapArea.gridRenderer.setRatio tileMapPub.pixelsPerUnit / tileSetPub.gridSize
  ui.mapArea.patternRenderer.setTileSet new TileSet(tileSetPub), data.tileMapUpdater.tileSetThreeTexture
  ui.mapArea.patternBackgroundRenderer.setup "#900090", 1 / tileMapPub.pixelsPerUnit, tileSetPub.gridSize
  return

onTileSetEditCommands = {}
onTileSetEditCommands.upload = ->
  ui.mapArea.patternRenderer.setTileSet new TileSet(data.tileMapUpdater.tileSetAsset.pub), data.tileMapUpdater.tileSetThreeTexture
  if ui.brushToolButton.checked
    selectBrush 0, 0
    setupPattern [ [0, 0, false, false, 0] ]
  return

onTileSetEditCommands.setProperty = ->
  tileMapPub = data.tileMapUpdater.tileMapAsset.pub
  tileSetPub = data.tileMapUpdater.tileSetAsset.pub

  ui.mapArea.cameraControls.setMultiplier tileMapPub.pixelsPerUnit / tileSetPub.gridSize / 1
  ui.mapArea.gridRenderer.setRatio tileMapPub.pixelsPerUnit / tileSetPub.gridSize
  ui.mapArea.patternRenderer.setTileSet new TileSet(tileSetPub), data.tileMapUpdater.tileSetThreeTexture
  ui.mapArea.patternBackgroundRenderer.setup "#900090", 1 / tileMapPub.pixelsPerUnit, tileSetPub.gridSize

  if ui.brushToolButton.checked
    selectBrush 0, 0
    setupPattern [ [0, 0, false, false, 0] ]
  return

# User interface
setupPattern = (layerData, width=1)->
  patternData =
    width: width, height: layerData.length / width
    pixelsPerUnit: data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit
    layerDepthOffset: data.tileMapUpdater.tileMapAsset.pub.layerDepthOffset
    layers: [ data: layerData ]

  ui.mapArea.patternRenderer.setTileMap new TileMap patternData
  return

onTileSetChange = (event) ->
  entry = SupClient.findEntryByPath data.projectClient.entries.pub, event.target.value

  if entry?.type == 'tileSet'
    socket.emit 'edit:assets', info.assetId, 'changeTileSet', entry.id, (err) -> if err? then alert err; return
  return

onResizeMapClick = ->
  SupClient.dialogs.prompt "Enter a new width for the map.", null, data.tileMapUpdater.tileMapAsset.pub.width, "Resize", (newWidth) =>
    return if ! newWidth?
    newWidth = parseInt(newWidth)
    return if isNaN newWidth

    SupClient.dialogs.prompt "Enter a new height for the map.", null, data.tileMapUpdater.tileMapAsset.pub.height, "Resize", (newHeight) =>
      return if ! newHeight?
      newHeight = parseInt(newHeight)
      return if isNaN newHeight

      return if newWidth == data.tileMapUpdater.tileMapAsset.pub.width and newHeight == data.tileMapUpdater.tileMapAsset.pub.height

      socket.emit 'edit:assets', info.assetId, 'resizeMap', newWidth, newHeight, (err) ->
        if err? then alert err
        return
      return
    return
  return

onMoveMapClick = ->
  SupClient.dialogs.prompt "Enter the horizontal offset.", null, 0, "Apply offset", (horizontalOffset) =>
    return if ! horizontalOffset?
    horizontalOffset = parseInt(horizontalOffset)
    return if isNaN horizontalOffset

    SupClient.dialogs.prompt "Enter the vertical offset.", null, 0, "Apply offset", (verticalOffset) =>
      return if ! verticalOffset?
      verticalOffset = parseInt(verticalOffset)
      return if isNaN verticalOffset

      return if horizontalOffset == 0 and verticalOffset == 0

      socket.emit 'edit:assets', info.assetId, 'moveMap', horizontalOffset, verticalOffset, (err) ->
        if err? then alert err
        return
      return
    return
  return

onNewLayerClick = ->
  SupClient.dialogs.prompt "Enter a name for the layer.", null, "Layer", "Create", (name) =>
    return if ! name?

    socket.emit 'edit:assets', info.assetId, 'newLayer', name, SupClient.getTreeViewInsertionPoint(ui.layersTreeView).index, (err, layerId) ->
      if err? then alert err; return

      ui.layersTreeView.clearSelection()
      ui.layersTreeView.addToSelection ui.layersTreeView.treeRoot.querySelector("li[data-id='#{layerId}']")
      ui.tileSetArea.selectedLayerId = layerId
      return
    return
  return

onRenameLayerClick = ->
  return if ui.layersTreeView.selectedNodes.length != 1

  selectedNode = ui.layersTreeView.selectedNodes[0]
  layer = data.tileMapUpdater.tileMapAsset.layers.byId[selectedNode.dataset.id]

  SupClient.dialogs.prompt "Enter a new name for the layer.", null, layer.name, "Rename", (newName) =>
    return if ! newName?

    socket.emit 'edit:assets', info.assetId, 'renameLayer', layer.id, newName, (err) ->
      alert err if err?
      return
    return
  return

onDeleteLayerClick = ->
  return if ui.layersTreeView.selectedNodes.length != 1
  SupClient.dialogs.confirm "Are you sure you want to delete the selected layer?", "Delete", (confirm) =>
    return if ! confirm

    selectedNode = ui.layersTreeView.selectedNodes[0]
    socket.emit 'edit:assets', info.assetId, 'deleteLayer', selectedNode.dataset.id, (err) ->
      alert err if err?; return
    return
  return

onLayerDrop = (dropInfo, orderedNodes) =>
  id = orderedNodes[0].dataset.id

  newIndex = SupClient.getListViewDropIndex dropInfo, data.tileMapUpdater.tileMapAsset.layers
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
  for id, layerMesh of data.tileMapUpdater.tileMapRenderer.layerMeshesById
    if ui.highlightCheckbox.checked and id != ui.tileSetArea.selectedLayerId
      layerMesh.material.opacity = ui.highlightSlider.value / 100
    else
      layerMesh.material.opacity = 1
  return

selectBrush = (x, y, width=1, height=1) ->
  ratio = data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize
  if x? and y?
    data.tileSetUpdater.tileSetRenderer.select x, y, width, height

  else
    position = data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalPosition()
    startX = position.x * ratio
    startY =  - position.y * ratio

    scale = data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalScale()
    layerData = []
    for y in [scale.y - 1..0]
      for x in [0...scale.x]
        layerData.push [startX + x, startY + y, false, false, 0]

    setupPattern layerData, scale.x

  ui.brushToolButton.checked = true
  ui.mapArea.patternActor.threeObject.visible = true
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = true
  ui.mapArea.patternBackgroundActor.threeObject.visible = true
  ui.mapArea.patternBackgroundActor.setLocalScale new SupEngine.THREE.Vector3 width, height, 1
  return

selectSelection = ->
  ui.selectionToolButton.checked = true
  ui.mapArea.patternActor.threeObject.visible = false
  ui.mapArea.patternBackgroundActor.threeObject.visible = false
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = false

  ui.mapArea.selectionStartPoint = null
  return

selectEraser = ->
  ui.eraserToolButton.checked = true
  ui.mapArea.patternActor.threeObject.visible = false
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = false
  ui.mapArea.patternBackgroundActor.threeObject.visible = true
  ui.mapArea.patternBackgroundActor.setLocalScale new SupEngine.THREE.Vector3 1, 1, 1
  return

# Drawing
draw = =>
  requestAnimationFrame draw

  return if ! data? or ! data.tileMapUpdater.tileMapAsset? or ! data.tileMapUpdater.tileSetAsset?

  handleMapArea()
  handleTileSetArea()
  return

editMap = (x, y, tileValue) =>
  if x >= 0 and x < data.tileMapUpdater.tileMapAsset.pub.width and y >= 0 and y < data.tileMapUpdater.tileMapAsset.pub.height
    layer = data.tileMapUpdater.tileMapAsset.layers.byId[ui.tileSetArea.selectedLayerId]
    index = y * data.tileMapUpdater.tileMapAsset.pub.width + x

    if tileValue?
      sameTile = true
      for i in [0...tileValue.length]
        if layer.data[index][i] != tileValue[i]
          sameTile = false
          break
      return if sameTile

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

handleMapArea = ->
  ui.mapArea.gameInstance.update()

  return if ! data? or ! data.tileMapUpdater.tileMapAsset? or ! data.tileMapUpdater.tileSetAsset?

  [mouseX, mouseY] = getMapGridPosition ui.mapArea.gameInstance, ui.mapArea.cameraComponent

  # Edit tiles
  if ui.mapArea.gameInstance.input.mouseButtons[0].isDown
    if ui.eraserToolButton.checked
      editMap mouseX, mouseY, null

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
      if mouseX >= 0 and mouseX < data.tileMapUpdater.tileMapAsset.pub.width and mouseY >= 0 and mouseY < data.tileMapUpdater.tileMapAsset.pub.height
        layer = data.tileMapUpdater.tileMapAsset.layers.byId[ui.tileSetArea.selectedLayerId]
        tile = layer.data[mouseY * data.tileMapUpdater.tileMapAsset.pub.width + mouseX]
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
    x = Math.max(0, Math.min(data.tileMapUpdater.tileMapAsset.pub.width - 1, mouseX))
    y = Math.max(0, Math.min(data.tileMapUpdater.tileMapAsset.pub.height - 1, mouseY))

    ratio = data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize
    patternPosition = new SupEngine.THREE.Vector3 x/ratio, y/ratio, data.tileMapUpdater.tileMapAsset.layers.pub.length * data.tileMapUpdater.tileMapAsset.pub.layerDepthOffset
    ui.mapArea.patternActor.setLocalPosition patternPosition
    ui.mapArea.patternBackgroundActor.setLocalPosition patternPosition

  # Selection
  if ui.selectionToolButton.checked

    if ui.mapArea.gameInstance.input.mouseButtons[0].wasJustPressed
      # A pattern is already in the buffer
      if ! ui.mapArea.patternActor.threeObject.visible
        if mouseX >= 0 and mouseX < data.tileMapUpdater.tileMapAsset.pub.width and mouseY >= 0 and mouseY < data.tileMapUpdater.tileMapAsset.pub.height
          ui.mapArea.patternBackgroundActor.threeObject.visible = true
          ui.mapArea.selectionStartPoint = { x: mouseX, y: mouseY }

        else
          ui.mapArea.selectionStartPoint = null
          ui.mapArea.patternActor.threeObject.visible = false
          ui.mapArea.patternBackgroundActor.threeObject.visible = false

    if ui.mapArea.selectionStartPoint?
      if ui.mapArea.gameInstance.input.mouseButtons[0].isDown
        # Clamp mouse values
        x = Math.max(0, Math.min(data.tileMapUpdater.tileMapAsset.pub.width - 1, mouseX))
        y = Math.max(0, Math.min(data.tileMapUpdater.tileMapAsset.pub.height - 1, mouseY))

        ui.mapArea.selectionEndPoint = { x, y }

      startX = Math.min ui.mapArea.selectionStartPoint.x, ui.mapArea.selectionEndPoint.x
      startY = Math.min ui.mapArea.selectionStartPoint.y, ui.mapArea.selectionEndPoint.y
      width = Math.abs(ui.mapArea.selectionEndPoint.x - ui.mapArea.selectionStartPoint.x) + 1
      height = Math.abs(ui.mapArea.selectionEndPoint.y - ui.mapArea.selectionStartPoint.y) + 1

      if ui.mapArea.gameInstance.input.mouseButtons[0].isDown
        ratio = data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize
        patternPosition = new SupEngine.THREE.Vector3 startX/ratio, startY/ratio, data.tileMapUpdater.tileMapAsset.layers.pub.length * data.tileMapUpdater.tileMapAsset.pub.layerDepthOffset
        ui.mapArea.patternBackgroundActor.setLocalPosition patternPosition
        ui.mapArea.patternBackgroundActor.setLocalScale new SupEngine.THREE.Vector3 width, height, 1

      # Delete selection
      else if ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_DELETE].wasJustReleased
        for y in [0...height]
          for x in [0...width]
            editMap startX + x, startY + y, null

        ui.mapArea.patternBackgroundActor.threeObject.visible = false
        ui.mapArea.selectionStartPoint = null

      # Move/duplicate the selection
      else if ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_M].wasJustReleased or
      ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_D].wasJustReleased
        layerData = []
        layer = data.tileMapUpdater.tileMapAsset.layers.byId[ui.tileSetArea.selectedLayerId]

        for y in [0...height]
          for x in [0...width]
            tile = layer.data[(startY + y) * data.tileMapUpdater.tileMapAsset.pub.width + startX + x]
            layerData.push tile

            if ! ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_D].wasJustReleased
              editMap startX + x, startY + y, null

        setupPattern layerData, width
        ui.mapArea.patternActor.threeObject.visible = true
        ui.mapArea.selectionStartPoint = null

        ui.mapArea.duplicatingSelection = ui.mapArea.gameInstance.input.keyboardButtons[window.KeyEvent.DOM_VK_D].wasJustReleased

  ui.mapArea.gameInstance.draw()
  return

getMapGridPosition = (gameInstance, cameraComponent)->
  mousePosition = gameInstance.input.mousePosition
  position = new SupEngine.THREE.Vector3 mousePosition.x, mousePosition.y, 0
  cameraPosition = cameraComponent.actor.getLocalPosition()

  x = position.x / gameInstance.threeRenderer.domElement.width

  x = x * 2 - 1
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio
  x += cameraPosition.x
  x *= data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize
  x = Math.floor(x)

  y = position.y / gameInstance.threeRenderer.domElement.height
  y = y * 2 - 1
  y *= cameraComponent.orthographicScale / 2
  y -= cameraPosition.y
  y *= data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize
  y = Math.floor(y)
  return [x, -y-1]

handleTileSetArea = ->
  ui.tileSetArea.gameInstance.update()

  tilesPerRow = data.tileMapUpdater.tileSetAsset.pub.domImage.width / data.tileMapUpdater.tileSetAsset.pub.gridSize
  tilesPerColumn = data.tileMapUpdater.tileSetAsset.pub.domImage.height / data.tileMapUpdater.tileSetAsset.pub.gridSize

  [mouseX, mouseY] = getTileSetGridPosition ui.tileSetArea.gameInstance, ui.tileSetArea.cameraComponent
  if ui.tileSetArea.gameInstance.input.mouseButtons[0].wasJustPressed

    if mouseX >= 0 and mouseX < tilesPerRow and mouseY >= 0 and mouseY < tilesPerColumn
      ui.tileSetArea.selectionStartPoint = { x: mouseX, y: mouseY }
      selectBrush mouseX, mouseY

  else if ui.tileSetArea.gameInstance.input.mouseButtons[0].wasJustReleased and ui.tileSetArea.selectionStartPoint?
    # Clamp mouse values
    x = Math.max(0, Math.min(tilesPerRow - 1, mouseX))
    y = Math.max(0, Math.min(tilesPerColumn - 1, mouseY))

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
    x = Math.max(0, Math.min(tilesPerRow - 1, mouseX))
    y = Math.max(0, Math.min(tilesPerColumn - 1, mouseY))

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

    data.tileSetUpdater.tileSetRenderer.select x, y, width, height

  ui.tileSetArea.gameInstance.draw()
  return

getTileSetGridPosition = (gameInstance, cameraComponent)->
  mousePosition = gameInstance.input.mousePosition
  position = new SupEngine.THREE.Vector3 mousePosition.x, mousePosition.y, 0
  cameraPosition = cameraComponent.actor.getLocalPosition()

  x = position.x / gameInstance.threeRenderer.domElement.width

  x = x * 2 - 1
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio
  x += cameraPosition.x
  x = Math.floor(x)

  y = position.y / gameInstance.threeRenderer.domElement.height
  y = y * 2 - 1
  y *= cameraComponent.orthographicScale / 2
  y -= cameraPosition.y
  y = Math.floor(y)
  return [x, y]

# Start
start()
