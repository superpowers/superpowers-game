SpriteRenderer = SupEngine.componentClasses.SpriteRenderer

TreeView = require 'dnd-tree-view'
SpriteOriginMarker = require './SpriteOriginMarker'

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

  # Drawing
  ui.image = new Image

  ui.spritesheetCanvasCtx = document.querySelector('canvas.spritesheet-canvas').getContext('2d')

  ui.animationArea = {}
  ui.animationArea.gameInstance = new SupEngine.GameInstance document.querySelector('canvas.animation-canvas')
  ui.animationArea.gameInstance.threeRenderer.setClearColor 0xbbbbbb
  ui.animationArea.gameInstance.update()
  ui.animationArea.gameInstance.draw()

  cameraActor = new SupEngine.Actor ui.animationArea.gameInstance, "Camera"
  cameraActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 1
  cameraComponent = new SupEngine.componentClasses.Camera cameraActor
  cameraComponent.setOrthographicMode true
  cameraComponent.setOrthographicScale 5
  ui.animationArea.cameraControls = new SupEngine.editorComponentClasses.Camera2DControls cameraActor, cameraComponent,
    zoomSpeed: 1.5
    zoomMin: 1
    zoomMax: 60

  originActor = new SupEngine.Actor ui.animationArea.gameInstance, "Origin"
  ui.originMakerComponent = new SpriteOriginMarker originActor

  ui.animationArea.animationPlay = document.querySelector('button.animation-play')
  ui.animationArea.animationPlay.addEventListener 'click', onPlayAnimation

  ui.animationArea.animationSlider = document.querySelector('input.animation-slider')
  ui.animationArea.animationSlider.addEventListener 'input', onChangeAnimationTime

  # Sidebar
  fileSelect = document.querySelector('input.file-select')
  fileSelect.addEventListener 'change', onFileSelectChange
  document.querySelector('button.upload').addEventListener 'click', => fileSelect.click(); return

  document.querySelector('button.download').addEventListener 'click', onDownloadSpritesheet

  ui.allSettings = ['filtering', 'pixelsPerUnit', 'framesPerSecond', 'alphaTest', 'grid.width', 'grid.height', 'origin.x', 'origin.y']
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
      if setting == 'filtering'
        settingObj.addEventListener 'change', (event) =>
          socket.emit 'edit:assets', info.assetId, 'setProperty', setting, event.target.value, (err) -> if err? then alert err; return
      else if setting.indexOf('origin') != -1
        settingObj.addEventListener 'change', (event) =>
          socket.emit 'edit:assets', info.assetId, 'setProperty', setting, event.target.value / 100, (err) -> if err? then alert err; return
      else if setting == 'alphaTest'
        settingObj.addEventListener 'change', (event) =>
          socket.emit 'edit:assets', info.assetId, 'setProperty', setting, parseFloat(event.target.value), (err) -> if err? then alert err; return
      else
        settingObj.addEventListener 'change', (event) =>
          socket.emit 'edit:assets', info.assetId, 'setProperty', setting, parseInt(event.target.value), (err) -> if err? then alert err; return

  document.querySelector('button.set-grid-width').addEventListener 'click', onSetGridWidth
  document.querySelector('button.set-grid-height').addEventListener 'click', onSetGridHeight

  # Animations
  ui.animationsTreeView = new TreeView document.querySelector('.animations-tree-view'), onAnimationDrop
  ui.animationsTreeView.on 'selectionChange', updateSelectedAnimation

  document.querySelector('button.new-animation').addEventListener 'click', onNewAnimationClick
  document.querySelector('button.rename-animation').addEventListener 'click', onRenameAnimationClick
  document.querySelector('button.delete-animation').addEventListener 'click', onDeleteAnimationClick

  requestAnimationFrame draw
  return

# Network callbacks
onEditCommands =  {}
onConnected = ->
  data = {}
  data.projectClient = new SupClient.ProjectClient socket, subEntries: false

  spriteActor = new SupEngine.Actor ui.animationArea.gameInstance, "Sprite"
  spriteRenderer = new SpriteRenderer spriteActor
  config = spriteAssetId: info.assetId, animationId: null
  receiveCallbacks = sprite: onAssetReceived
  editCallbacks = sprite: onEditCommands

  data.spriteUpdater = new SpriteRenderer.Updater data.projectClient, spriteRenderer, config, receiveCallbacks, editCallbacks
  return

onAssetReceived = (url) ->
  ui.image.src = url

  for setting in ui.allSettings
    parts = setting.split '.'
    obj = data.spriteUpdater.spriteAsset.pub
    obj = obj[part] for part in parts.slice(0, parts.length - 1)
    setupProperty setting, obj[parts[parts.length - 1]]

  setupAnimation animation, index for animation, index in data.spriteUpdater.spriteAsset.pub.animations
  return

onEditCommands.upload = (url) ->
  ui.image.src = url
  return

onEditCommands.setProperty = (path, value) ->
  setupProperty path, value
  return

onEditCommands.newAnimation = (animation, index) ->
  setupAnimation animation, index
  return

onEditCommands.deleteAnimation = (id) ->
  animationElt = ui.animationsTreeView.treeRoot.querySelector("[data-id='#{id}']")
  ui.animationsTreeView.remove animationElt

  updateSelectedAnimation() if ui.selectedAnimationId == id
  return

onEditCommands.moveAnimation = (id, index) ->
  animationElt = ui.animationsTreeView.treeRoot.querySelector("[data-id='#{id}']")
  ui.animationsTreeView.insertAt animationElt, 'item', index
  return

onEditCommands.setAnimationProperty = (id, key, value) ->
  animationElt = ui.animationsTreeView.treeRoot.querySelector("[data-id='#{id}']")

  switch key
    when 'name' then animationElt.querySelector('.name').textContent = value
    when 'startFrameIndex' then animationElt.querySelector('.start-frame-index').value = value
    when 'endFrameIndex' then animationElt.querySelector('.end-frame-index').value = value

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

onDownloadSpritesheet = (event) ->
  SupClient.dialogs.prompt "Enter a name for the image.", null, "Image", "Download", (name) =>
    return if ! name?

    a = document.createElement "a"
    document.body.appendChild a
    a.style = "display: none"
    a.href = data.spriteUpdater.url

    a.download = name + '.png'
    a.click()
    document.body.removeChild a
    return
  return

onSetGridWidth = (event) =>
  return if ui.image.src == ''

  SupClient.dialogs.prompt "How many frames per row?", null, 1, "Set grid width", (framesPerRow) =>
    return if ! framesPerRow?

    framesPerRow = parseInt framesPerRow
    return if isNaN framesPerRow

    socket.emit 'edit:assets', info.assetId, 'setProperty', 'grid.width', Math.floor(ui.image.width / framesPerRow), (err) -> if err? then alert err; return
    return
  return

onSetGridHeight = (event) =>
  return if ui.image.src == ''

  SupClient.dialogs.prompt "How many frames per column?", null, 1, "Set grid height", (framesPerColumn) =>
    return if ! framesPerColumn?

    framesPerColumn = parseInt framesPerColumn
    return if isNaN framesPerColumn

    socket.emit 'edit:assets', info.assetId, 'setProperty', 'grid.height', Math.floor(ui.image.height / framesPerColumn), (err) -> if err? then alert err; return
    return
  return

onNewAnimationClick = ->
  SupClient.dialogs.prompt "Enter a name for the animation.", null, "Animation", "Create", (name) =>
    return if ! name?

    socket.emit 'edit:assets', info.assetId, 'newAnimation', name, (err, animationId) ->
      if err? then alert err; return

      ui.animationsTreeView.clearSelection()
      ui.animationsTreeView.addToSelection ui.animationsTreeView.treeRoot.querySelector("li[data-id='#{animationId}']")
      updateSelectedAnimation()
      return
    return
  return

onRenameAnimationClick = ->
  return if ui.animationsTreeView.selectedNodes.length != 1

  selectedNode = ui.animationsTreeView.selectedNodes[0]
  animation = data.spriteUpdater.spriteAsset.animations.byId[parseInt(selectedNode.dataset.id)]

  SupClient.dialogs.prompt "Enter a new name for the animation.", null, animation.name, "Rename", (newName) =>
    return if ! newName?

    socket.emit 'edit:assets', info.assetId, 'setAnimationProperty', animation.id, 'name', newName, (err) ->
      alert err if err?
      return
    return
  return

onDeleteAnimationClick = ->
  return if ui.animationsTreeView.selectedNodes.length == 0
  SupClient.dialogs.confirm "Are you sure you want to delete the selected animations?", "Delete", (confirm) =>
    return if ! confirm

    for selectedNode in ui.animationsTreeView.selectedNodes
      socket.emit 'edit:assets', info.assetId, 'deleteAnimation', parseInt(selectedNode.dataset.id), (err) ->
        alert err if err?; return
    return
  return

onAnimationDrop = (dropInfo, orderedNodes) =>
  animationIds = ( parseInt(animation.dataset.id) for animation in orderedNodes )

  index = SupClient.getListViewDropIndex dropInfo, data.spriteUpdater.spriteAsset.animations

  for id, i in animationIds
    socket.emit 'edit:assets', info.assetId, 'moveAnimation', id, index + i, (err) ->
      if err? then alert err; return

  false

updateSelectedAnimation = ->
  selectedAnimElt = ui.animationsTreeView.selectedNodes[0]
  if selectedAnimElt?
    ui.selectedAnimationId = parseInt selectedAnimElt.dataset.id
    data.spriteUpdater.config_setProperty "animationId", ui.selectedAnimationId
    ui.animationArea.animationPlay.disabled = false
    ui.animationArea.animationSlider.disabled = false
  else
    ui.selectedAnimationId = null
    data.spriteUpdater.config_setProperty "animationId", null
    ui.animationArea.animationPlay.disabled = true
    ui.animationArea.animationSlider.disabled = true
    ui.animationArea.animationSlider.value = 0

  ui.animationArea.animationPlay.textContent = 'Pause'

  for button in document.querySelectorAll('.animations-buttons button')
    button.disabled = ! ui.selectedAnimationId? and button.className != 'new-animation'

  return

onPlayAnimation = ->
  if ui.animationArea.animationPlay.textContent == 'Pause'
    data.spriteUpdater.spriteRenderer.pauseAnimation()
    ui.animationArea.animationPlay.textContent = 'Play'
  else
    data.spriteUpdater.spriteRenderer.playAnimation()
    ui.animationArea.animationPlay.textContent = 'Pause'
  return

onChangeAnimationTime = ->
  return if ! data.spriteUpdater?
  data.spriteUpdater.spriteRenderer.setAnimationTime ui.animationArea.animationSlider.value / 100 * data.spriteUpdater.spriteRenderer.getAnimationDuration()
  return

setupProperty = (path, value) ->
  parts = path.split '.'

  obj = ui.settings
  obj = obj[part] for part in parts.slice(0, parts.length - 1)
  value *= 100 if path.indexOf('origin') != -1
  obj[parts[parts.length - 1]].value = value

  if path == "pixelsPerUnit"
    ui.animationArea.cameraControls.setMultiplier value
    ui.originMakerComponent.setScale 100 / value
  return

setupAnimation = (animation, index) ->
  liElt = document.createElement('li')
  liElt.dataset.id = animation.id

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = animation.name
  liElt.appendChild nameSpan

  startFrameIndexInput = document.createElement('input')
  startFrameIndexInput.type = 'number'
  startFrameIndexInput.className = 'start-frame-index'
  startFrameIndexInput.value = animation.startFrameIndex
  liElt.appendChild startFrameIndexInput

  startFrameIndexInput.addEventListener 'change', (event) =>
    socket.emit 'edit:assets', info.assetId, 'setAnimationProperty', animation.id, 'startFrameIndex', parseInt(event.target.value), (err) ->
      if err? then alert err; return

  endFrameIndexInput = document.createElement('input')
  endFrameIndexInput.type = 'number'
  endFrameIndexInput.className = 'end-frame-index'
  endFrameIndexInput.value = animation.endFrameIndex
  liElt.appendChild endFrameIndexInput

  endFrameIndexInput.addEventListener 'change', (event) =>
    socket.emit 'edit:assets', info.assetId, 'setAnimationProperty', animation.id, 'endFrameIndex', parseInt(event.target.value), (err) ->
      if err? then alert err; return

  ui.animationsTreeView.insertAt liElt, 'item', index, null
  return

# Drawing
draw = ->
  requestAnimationFrame draw

  drawSpritesheet() if ui.image.width != 0
  drawCurrentAnimation()
  return

drawSpritesheet = ->
  ui.spritesheetCanvasCtx.clearRect 0, 0, ui.spritesheetCanvasCtx.canvas.width, ui.spritesheetCanvasCtx.canvas.height

  ui.spritesheetCanvasCtx.canvas.width = ui.spritesheetCanvasCtx.canvas.clientWidth
  ui.spritesheetCanvasCtx.canvas.height = ui.spritesheetCanvasCtx.canvas.clientHeight

  ui.spritesheetCanvasCtx.fillStyle = "#bbbbbb"
  ui.spritesheetCanvasCtx.fillRect 0, 0, ui.spritesheetCanvasCtx.canvas.width, ui.spritesheetCanvasCtx.canvas.height

  ui.spritesheetCanvasCtx.save()
  scaleRatio = Math.max ui.image.width / ui.spritesheetCanvasCtx.canvas.width, ui.image.height / ui.spritesheetCanvasCtx.canvas.height
  ui.spritesheetCanvasCtx.translate (ui.spritesheetCanvasCtx.canvas.width - ui.image.width / scaleRatio) / 2, 0
  ui.spritesheetCanvasCtx.scale 1 / scaleRatio, 1 / scaleRatio

  #ui.spritesheetCanvasCtx.fillStyle = "#bbbbbb"
  #ui.spritesheetCanvasCtx.fillRect 0, 0, ui.image.width, ui.image.height

  patternCanvas = document.createElement "canvas"
  size = Math.max 1, ui.image.width / 50
  patternCanvas.height = patternCanvas.width = size * 2
  patternCanvasCtx = patternCanvas.getContext "2d"
  patternCanvasCtx.fillStyle = "#888888"
  patternCanvasCtx.fillRect 0, 0, size, size
  patternCanvasCtx.fillRect size, size, size, size
  patternCanvasCtx.fillStyle = "#FFFFFF"
  patternCanvasCtx.fillRect size, 0, size, size
  patternCanvasCtx.fillRect 0, size, size, size

  pattern = ui.spritesheetCanvasCtx.createPattern patternCanvas, "repeat"
  ui.spritesheetCanvasCtx.rect 0, 0, ui.image.width, ui.image.height
  ui.spritesheetCanvasCtx.fillStyle = pattern
  ui.spritesheetCanvasCtx.fill()

  ui.spritesheetCanvasCtx.drawImage ui.image, 0 , 0

  if ui.selectedAnimationId?
    asset = data.spriteUpdater.spriteAsset

    selectedAnimation = asset.animations.byId[ui.selectedAnimationId]

    width = asset.pub.grid.width
    height = asset.pub.grid.height

    framesPerRow = Math.floor ui.image.width / width
    ui.spritesheetCanvasCtx.strokeStyle = "#900090"
    ui.spritesheetCanvasCtx.setLineDash [10, 10]
    ui.spritesheetCanvasCtx.lineWidth = 2
    ui.spritesheetCanvasCtx.beginPath()
    for frameIndex in [selectedAnimation.startFrameIndex .. selectedAnimation.endFrameIndex]
      frameX = frameIndex % framesPerRow
      frameY = Math.floor frameIndex / framesPerRow

      ui.spritesheetCanvasCtx.moveTo( frameX * width, frameY * height )
      ui.spritesheetCanvasCtx.lineTo( (frameX+1) * width - 1, frameY * height )
      ui.spritesheetCanvasCtx.lineTo( (frameX+1) * width - 1, (frameY+1) * height - 1 )
      ui.spritesheetCanvasCtx.lineTo( frameX * width, (frameY+1) * height - 1 )
      ui.spritesheetCanvasCtx.lineTo( frameX * width, frameY * height )

    ui.spritesheetCanvasCtx.stroke()

  ui.spritesheetCanvasCtx.restore()
  return

drawCurrentAnimation = ->
  ui.animationArea.gameInstance.update()
  ui.animationArea.gameInstance.draw()

  if data? and ui.selectedAnimationId?
    animationTime = data.spriteUpdater.spriteRenderer.getAnimationTime() / data.spriteUpdater.spriteRenderer.getAnimationDuration()
    ui.animationArea.animationSlider.value = animationTime * 100
  return

# Start
start()
