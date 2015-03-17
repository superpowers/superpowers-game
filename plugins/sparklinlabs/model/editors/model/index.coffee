async = require 'async'
ModelRenderer = SupEngine.componentPlugins.ModelRenderer

TreeView = require 'dnd-tree-view'
THREE = SupEngine.THREE

qs = require('querystring').parse window.location.search.slice(1)
info = { projectId: qs.project, assetId: qs.asset }
data = null
ui = {}
socket = null

start = ->
  socket = SupClient.connect info.projectId
  socket.on 'connect', onConnected
  socket.on 'disconnect', SupClient.onDisconnected

  # Model upload
  modelFileSelect = document.querySelector('.model input.file-select')
  modelFileSelect.addEventListener 'change', onModelFileSelectChange
  document.querySelector('.model button.upload').addEventListener 'click', => modelFileSelect.click(); return

  # Diffuse map upload
  diffuseMapFileSelect = document.querySelector('.diffuse-map input.file-select')
  diffuseMapFileSelect.addEventListener 'change', onDiffuseMapFileSelectChange
  document.querySelector('.diffuse-map button.upload').addEventListener 'click', => diffuseMapFileSelect.click(); return

  # Animations
  ui.animationsTreeView = new TreeView document.querySelector('.animations-tree-view'), onAnimationDrop
  ui.animationsTreeView.on 'selectionChange', updateSelectedAnimation

  document.querySelector('button.new-animation').addEventListener 'click', onNewAnimationClick

  # Animation upload
  animationFileSelect = document.querySelector('.upload-animation.file-select')
  animationFileSelect.addEventListener 'change', onAnimationFileSelectChange
  document.querySelector('button.upload-animation').addEventListener 'click', => animationFileSelect.click(); return
  document.querySelector('button.rename-animation').addEventListener 'click', onRenameAnimationClick
  document.querySelector('button.delete-animation').addEventListener 'click', onDeleteAnimationClick

  # Setup 3D viewport
  canvasElt = document.querySelector('canvas')
  ui.gameInstance = new SupEngine.GameInstance canvasElt

  ui.cameraActor = new SupEngine.Actor ui.gameInstance, "Camera"
  ui.cameraActor.setLocalPosition new THREE.Vector3 0, 3, 10
  cameraComponent = new SupEngine.componentPlugins.Camera ui.cameraActor
  new SupEngine.editorComponents.Camera3DControls ui.cameraActor, cameraComponent

  ui.modelActor = new SupEngine.Actor ui.gameInstance, "Model"
  ui.modelRenderer = new ModelRenderer ui.modelActor

  ui.tickAnimationFrameId = requestAnimationFrame tick
  return

# Network callbacks
onConnected = ->
  data = {}
  data.projectClient = new SupClient.ProjectClient socket, subEntries: false

  modelActor = new SupEngine.Actor ui.gameInstance, "Model"
  modelRenderer = new ModelRenderer modelActor
  config = modelAssetId: info.assetId, animationId: null
  receiveCallbacks = model: onAssetReceived
  editCallbacks = model: onEditCommands

  data.modelUpdater = new ModelRenderer.Updater data.projectClient, modelRenderer, config, receiveCallbacks, editCallbacks
  return

onAssetReceived = ->
  setupAnimation animation, index for animation, index in data.modelUpdater.modelAsset.pub.animations
  return

onEditCommands = {}
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
  return

# User interface
importModel = require './importers'

onModelFileSelectChange = (event) ->
  return if event.target.files.length == 0

  importModel event.target.files, (err, data) ->
    event.target.parentElement.reset()

    if err? then alert "Could not import files: #{err.message}"; return

    socket.emit 'edit:assets', info.assetId, 'setAttributes', data.attributes, (err) ->
      if err? then alert err; return

    socket.emit 'edit:assets', info.assetId, 'setBones', data.bones, (err) ->
      if err? then alert err; return

    if data.maps?
      socket.emit 'edit:assets', info.assetId, 'setMaps', data.maps, (err) ->
        if err? then alert err; return

    return
  return

onDiffuseMapFileSelectChange = (event) ->
  reader = new FileReader
  reader.onload = (event) ->
    socket.emit 'edit:assets', info.assetId, 'setMaps', { diffuse: event.target.result }, (err) ->
      if err? then alert err; return
    return

  reader.readAsArrayBuffer event.target.files[0]
  event.target.parentElement.reset()
  return

onNewAnimationClick = ->
  SupClient.dialogs.prompt "Enter a name for the animation.", null, "Animation", "Create", (name) =>
    return if ! name?

    socket.emit 'edit:assets', info.assetId, 'newAnimation', name, null, null, (err, animationId) ->
      if err? then alert err; return

      ui.animationsTreeView.clearSelection()
      ui.animationsTreeView.addToSelection ui.animationsTreeView.treeRoot.querySelector("li[data-id='#{animationId}']")
      updateSelectedAnimation()
      return
    return
  return

onAnimationFileSelectChange = (event) ->
  return if event.target.files.length == 0

  animationId = ui.selectedAnimationId

  importModel event.target.files, (err, data) ->
    event.target.parentElement.reset()

    if err? then alert "Could not import files: #{err.message}"; return
    if ! data.animation? then alert "No animation found in imported files"; return

    # TODO: Check if bones are compatible

    socket.emit 'edit:assets', info.assetId, 'setAnimation', animationId, data.animation.duration, data.animation.keyFrames, (err) ->
      if err? then alert err; return

    return
  return

onRenameAnimationClick = ->
  return if ui.animationsTreeView.selectedNodes.length != 1

  selectedNode = ui.animationsTreeView.selectedNodes[0]
  animation = data.modelUpdater.modelAsset.animations.byId[parseInt(selectedNode.dataset.id)]

  SupClient.dialogs.prompt "Enter a new name for the animation.", null, animation.name, "Rename", (newName) =>
    return if ! newName?

    socket.emit 'edit:assets', info.assetId, 'setAnimationProperty', animation.id, 'name', newName, (err) ->
      alert err if err?; return
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

  index = SupClient.getListViewDropIndex dropInfo, data.asset.animations

  for id, i in animationIds
    socket.emit 'edit:assets', info.assetId, 'moveAnimation', id, index + i, (err) ->
      if err? then alert err; return

  false

updateSelectedAnimation = ->
  selectedAnimElt = ui.animationsTreeView.selectedNodes[0]
  if selectedAnimElt?
    ui.selectedAnimationId = parseInt selectedAnimElt.dataset.id
  else
    ui.selectedAnimationId = null
  data.modelUpdater.onConfigEdited "animationId", ui.selectedAnimationId

  for button in document.querySelectorAll('.animations-buttons button')
    button.disabled = ! ui.selectedAnimationId? and button.className != 'new-animation'
  return

setupAnimation = (animation, index) ->
  liElt = document.createElement('li')
  liElt.dataset.id = animation.id

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = animation.name
  liElt.appendChild nameSpan

  ui.animationsTreeView.insertAt liElt, 'item', index, null
  return

# Engine
tick = ->
  # FIXME: decouple update interval from render interval
  ui.gameInstance.update()
  ui.gameInstance.draw()
  ui.tickAnimationFrameId = requestAnimationFrame tick
  return

# Start
start()
