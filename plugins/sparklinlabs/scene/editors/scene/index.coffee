SceneAsset = SupCore.api.assetPlugins.scene
TreeView = require 'dnd-tree-view'
async = require 'async'
THREE = SupEngine.THREE
TransformMarker = require './TransformMarker'

qs = require('querystring').parse window.location.search.slice(1)
info = { projectId: qs.project, assetId: qs.asset }
data = null
ui = componentEditors: {}
socket = null
sceneSubscriber = {}

start = ->
  socket = SupClient.connect info.projectId
  socket.on 'connect', onConnected
  socket.on 'disconnect', SupClient.onDisconnected

  # Setup tree view
  ui.nodesTreeView = new TreeView document.querySelector('.nodes-tree-view'), onNodeDrop
  # ui.nodesTreeView.on 'activate', onNodeActivate
  ui.nodesTreeView.on 'selectionChange', onNodeSelect

  document.querySelector('button.new-node').addEventListener 'click', onNewNodeClick
  document.querySelector('button.rename-node').addEventListener 'click', onRenameNodeClick
  document.querySelector('button.duplicate-node').addEventListener 'click', onDuplicateNodeClick
  document.querySelector('button.delete-node').addEventListener 'click', onDeleteNodeClick

  # Inspector
  ui.inspectorElt = document.querySelector('.inspector')

  ui.transform =
    positionElts: ui.inspectorElt.querySelectorAll('.transform .position input')
    orientationElts: ui.inspectorElt.querySelectorAll('.transform .orientation input')
    scaleElts: ui.inspectorElt.querySelectorAll('.transform .scale input')

  for transformType, inputs of ui.transform
    input.addEventListener 'change', onTransformInputChange for input in inputs

  document.querySelector('button.new-component').addEventListener 'click', onNewComponentClick

  # Setup 3D viewport
  canvasElt = document.querySelector('canvas')

  ui.gameInstance = new SupEngine.GameInstance canvasElt
  ui.cameraActor = new SupEngine.Actor ui.gameInstance, "Camera"
  ui.cameraActor.setLocalPosition new THREE.Vector3 0, 0, 10
  cameraComponent = new SupEngine.componentPlugins.Camera ui.cameraActor
  new SupEngine.editorComponents.Camera3DControls ui.cameraActor, cameraComponent

  ui.bySceneNodeId = {}

  ui.tickAnimationFrameId = requestAnimationFrame tick
  return

# Network callbacks
onConnected = ->
  data = projectClient: new SupClient.ProjectClient socket, { subEntries: true }
  data.projectClient.sub info.assetId, 'scene', sceneSubscriber
  return

sceneSubscriber.onAssetTrashed = SupClient.onAssetTrashed
sceneSubscriber.onAssetReceived = (assetId, asset) ->
  data.asset = asset

  # Clear tree view
  ui.nodesTreeView.clearSelection()
  ui.nodesTreeView.treeRoot.innerHTML = ''

  # TODO: Clear existing actors

  walk = (node, parentNode, parentElt) ->
    liElt = createNodeElement node
    ui.nodesTreeView.append liElt, 'group', parentElt

    createNodeActor node

    if node.children?
      walk child, node, liElt for child in node.children

    return

  walk node, null, null for node in data.asset.nodes.pub
  return

sceneSubscriber.onAssetEdited = (id, command, args...) ->
  onAssetCommands[command]?.apply data.asset, args
  return

onAssetCommands = {}

onAssetCommands.addNode = (node, parentId, index) ->
  nodeElt = createNodeElement node
  parentElt = ui.nodesTreeView.treeRoot.querySelector("[data-id='#{parentId}']") if parentId?
  ui.nodesTreeView.insertAt nodeElt, 'group', index, parentElt

  createNodeActor node
  return

onAssetCommands.moveNode = (id, parentId, index) ->
  # Reparent tree node
  nodeElt = ui.nodesTreeView.treeRoot.querySelector("[data-id='#{id}']")
  isInspected = ui.nodesTreeView.selectedNodes.length == 1 and nodeElt == ui.nodesTreeView.selectedNodes[0]

  parentElt = ui.nodesTreeView.treeRoot.querySelector("[data-id='#{parentId}']") if parentId?
  ui.nodesTreeView.insertAt nodeElt, 'group', index, parentElt

  # Update actor
  nodeActor = ui.bySceneNodeId[id].actor
  parentNodeActor = ui.bySceneNodeId[parentId]?.actor
  nodeActor.setParent parentNodeActor

  # Update data.asset.nodes with new local transform
  node = data.asset.nodes.byId[id]
  node.position =
    x: nodeActor.threeObject.position.x
    y: nodeActor.threeObject.position.y
    z: nodeActor.threeObject.position.z

  node.orientation =
    x: nodeActor.threeObject.quaternion.x
    y: nodeActor.threeObject.quaternion.y
    z: nodeActor.threeObject.quaternion.z
    w: nodeActor.threeObject.quaternion.w

  node.scale =
    x: nodeActor.threeObject.scale.x
    y: nodeActor.threeObject.scale.y
    z: nodeActor.threeObject.scale.z

  # Refresh inspector
  if isInspected
    setInspectorPosition node.position
    setInspectorOrientation node.orientation
    setInspectorScale node.scale

  return

onAssetCommands.setNodeProperty = (id, path, value) ->
  nodeElt = ui.nodesTreeView.treeRoot.querySelector("[data-id='#{id}']")
  isInspected = ui.nodesTreeView.selectedNodes.length == 1 and nodeElt == ui.nodesTreeView.selectedNodes[0]

  switch path
    when 'name' then nodeElt.querySelector('.name').textContent = value
    when 'position'
      setInspectorPosition data.asset.nodes.byId[id].position if isInspected
      ui.bySceneNodeId[id].actor.setLocalPosition value
    when 'orientation'
      setInspectorOrientation data.asset.nodes.byId[id].orientation if isInspected
      ui.bySceneNodeId[id].actor.setLocalOrientation value
    when 'scale'
      setInspectorScale data.asset.nodes.byId[id].scale if isInspected
      ui.bySceneNodeId[id].actor.setLocalScale value

  return

onAssetCommands.duplicateNode = (node, parentId, index) ->
  onAssetCommands.addNode node, parentId, index
  return

onAssetCommands.removeNode = (id) ->
  nodeElt = ui.nodesTreeView.treeRoot.querySelector("[data-id='#{id}']")
  isInspected = ui.nodesTreeView.selectedNodes.length == 1 and nodeElt == ui.nodesTreeView.selectedNodes[0]

  ui.nodesTreeView.remove nodeElt
  if isInspected then onNodeSelect()

  ui.gameInstance.destroyActor ui.bySceneNodeId[id].actor
  delete ui.bySceneNodeId[id]
  return

onAssetCommands.addComponent = (nodeId, nodeComponent, index) ->
  isInspected = ui.nodesTreeView.selectedNodes.length == 1 and nodeId == parseInt(ui.nodesTreeView.selectedNodes[0].dataset.id)

  if isInspected
    componentElt = createComponentElement nodeId, nodeComponent
    # TODO: Take index into account
    ui.inspectorElt.querySelector('.components').appendChild componentElt

  createNodeActorComponent data.asset.nodes.byId[nodeId], nodeComponent, ui.bySceneNodeId[nodeId].actor
  return

onAssetCommands.setComponentProperty = (nodeId, componentId, path, value) ->
  componentUpdater = ui.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater
  componentUpdater.onConfigEdited path, value

  isInspected = ui.nodesTreeView.selectedNodes.length == 1 and nodeId == parseInt(ui.nodesTreeView.selectedNodes[0].dataset.id)
  ui.componentEditors[componentId].onConfigEdited path, value if isInspected
  return

onAssetCommands.removeComponent = (nodeId, componentId) ->
  isInspected = ui.nodesTreeView.selectedNodes.length == 1 and nodeId == parseInt(ui.nodesTreeView.selectedNodes[0].dataset.id)

  if isInspected
    ui.componentEditors[componentId].destroy()
    delete ui.componentEditors[componentId]

    componentElt = ui.inspectorElt.querySelector(".components > div[data-component-id='#{componentId}']")
    componentElt.parentElement.removeChild componentElt

  ui.gameInstance.destroyComponent ui.bySceneNodeId[nodeId].bySceneComponentId[componentId].component
  delete ui.bySceneNodeId[nodeId].bySceneComponentId[componentId]
  return

# User interface
createNodeElement = (node) ->
  liElt = document.createElement('li')
  liElt.dataset.id = node.id

  nameSpan = document.createElement('span')
  nameSpan.className = 'name'
  nameSpan.textContent = node.name
  liElt.appendChild nameSpan

  liElt

onNodeDrop = (dropInfo, orderedNodes) ->
  { parentId, index } = SupClient.getTreeViewDropPoint dropInfo, data.asset.nodes

  nodeIds = ( parseInt(node.dataset.id) for node in orderedNodes )

  sourceParentNode = data.asset.nodes.parentNodesById[nodeIds[0]]
  sourceChildren = sourceParentNode?.children ? data.asset.nodes.pub
  sameParent = parentId == sourceParentNode?.id

  i = 0
  for id in nodeIds
    socket.emit 'edit:assets', info.assetId, 'moveNode', id, parentId, index + i, (err) -> if err? then alert err; return
    if ! sameParent or sourceChildren.indexOf(data.asset.nodes.byId[id]) >= index then i++

  false

onNodeSelect = ->
  # Clear component editors
  componentEditor.destroy() for componentId, componentEditor of ui.componentEditors
  ui.componentEditors = {}

  # Setup transform
  nodeElt = ui.nodesTreeView.selectedNodes[0]
  if ! nodeElt? or ui.nodesTreeView.selectedNodes.length != 1
    ui.inspectorElt.classList.add 'noSelection'
    return

  ui.inspectorElt.classList.remove 'noSelection'

  node = data.asset.nodes.byId[nodeElt.dataset.id]
  setInspectorPosition node.position
  setInspectorOrientation node.orientation
  setInspectorScale node.scale

  # Setup component editors
  componentsElt = ui.inspectorElt.querySelector('.components')
  componentsElt.innerHTML = ''

  for component in node.components
    componentElt = createComponentElement node.id, component
    ui.inspectorElt.querySelector('.components').appendChild componentElt

  return

roundForInspector = (number) -> parseFloat(number.toFixed(3))

setInspectorPosition = (position) ->
  ui.transform.positionElts[0].value = roundForInspector position.x
  ui.transform.positionElts[1].value = roundForInspector position.y
  ui.transform.positionElts[2].value = roundForInspector position.z
  return

setInspectorOrientation = (orientation) ->
  euler = new THREE.Euler().setFromQuaternion(orientation)
  ui.transform.orientationElts[0].value = roundForInspector THREE.Math.radToDeg(euler.x)
  ui.transform.orientationElts[1].value = roundForInspector THREE.Math.radToDeg(euler.y)
  ui.transform.orientationElts[2].value = roundForInspector THREE.Math.radToDeg(euler.z)
  return

setInspectorScale = (scale) ->
  ui.transform.scaleElts[0].value = roundForInspector scale.x
  ui.transform.scaleElts[1].value = roundForInspector scale.y
  ui.transform.scaleElts[2].value = roundForInspector scale.z
  return

onNewNodeClick = ->
  name = prompt "Actor name", "Actor"
  return if ! name?

  options = SupClient.getTreeViewInsertionPoint ui.nodesTreeView

  offset = new THREE.Vector3(0, 0, -5).applyQuaternion ui.cameraActor.getGlobalOrientation()
  position = ui.cameraActor.getGlobalPosition().add offset
  options.transform = { position }

  socket.emit 'edit:assets', info.assetId, 'addNode', name, options, (err, nodeId) ->
    if err? then alert err; return

    ui.nodesTreeView.clearSelection()
    ui.nodesTreeView.addToSelection ui.nodesTreeView.treeRoot.querySelector("li[data-id='#{nodeId}']")
    onNodeSelect()
    return

onRenameNodeClick = ->
  return if ui.nodesTreeView.selectedNodes.length != 1

  selectedNode = ui.nodesTreeView.selectedNodes[0]
  node = data.asset.nodes.byId[parseInt(selectedNode.dataset.id)]

  newName = prompt "New name", node.name
  return if ! newName?

  socket.emit 'edit:assets', info.assetId, 'setNodeProperty', node.id, 'name', newName, (err) ->
    alert err if err?; return

onDuplicateNodeClick = ->
  return if ui.nodesTreeView.selectedNodes.length != 1

  selectedNode = ui.nodesTreeView.selectedNodes[0]
  node = data.asset.nodes.byId[parseInt(selectedNode.dataset.id)]

  options = SupClient.getTreeViewInsertionPoint ui.nodesTreeView

  socket.emit 'edit:assets', info.assetId, 'duplicateNode', node.id, options.index, (err) ->
    if err? then alert err; return

    ui.nodesTreeView.clearSelection()
    ui.nodesTreeView.addToSelection ui.nodesTreeView.treeRoot.querySelector("li[data-id='#{node.id}']")
    onNodeSelect()
    return
  return

onDeleteNodeClick = ->
  return if ui.nodesTreeView.selectedNodes.length == 0
  return if ! confirm "Are you sure you want to delete the selected actors?"

  for selectedNode in ui.nodesTreeView.selectedNodes
    socket.emit 'edit:assets', info.assetId, 'removeNode', parseInt(selectedNode.dataset.id), (err) ->
      alert err if err?; return

  return

onTransformInputChange = (event) ->
  return if ui.nodesTreeView.selectedNodes.length != 1

  transformType = event.target.parentElement.parentElement.className

  inputs = ui.transform["#{transformType}Elts"]

  value =
    x: parseFloat(inputs[0].value)
    y: parseFloat(inputs[1].value)
    z: parseFloat(inputs[2].value)

  if transformType == 'orientation'
    euler = new THREE.Euler THREE.Math.degToRad(value.x), THREE.Math.degToRad(value.y), THREE.Math.degToRad(value.z)
    quaternion = new THREE.Quaternion().setFromEuler euler
    value = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }

  nodeId = parseInt(ui.nodesTreeView.selectedNodes[0].dataset.id)

  socket.emit 'edit:assets', info.assetId, 'setNodeProperty', nodeId, transformType, value, (err) ->
    alert err if err?; return
  return

createComponentElement = (nodeId, component) ->
  componentElt = document.createElement('div')
  componentElt.dataset.componentId = component.id

  template = document.getElementById('component-cartridge-template')
  clone = document.importNode template.content, true

  clone.querySelector('.type').textContent = component.type
  tbody = clone.querySelector('.settings')

  setProperty = (path, value) ->
    socket.emit 'edit:assets', info.assetId, 'setComponentProperty', nodeId, component.id, path, value, (err) ->
      if err? then alert err; return

  componentEditorPlugin = SupEngine.componentEditorPlugins[component.type]
  ui.componentEditors[component.id] = new componentEditorPlugin SupClient, tbody, component.config, data.projectClient, setProperty

  clone.querySelector('.delete-component').addEventListener 'click', onDeleteComponentClick

  componentElt.appendChild clone
  componentElt

onNewComponentClick = ->
  componentType = prompt "Component type", ""
  return if ! componentType?

  nodeId = parseInt(ui.nodesTreeView.selectedNodes[0].dataset.id)

  socket.emit 'edit:assets', info.assetId, 'addComponent', nodeId, componentType, null, (err, componentId) ->
    if err? then alert err; return
    return
  return

onDeleteComponentClick = (event) ->
  return if ! confirm "Are you sure you want to delete this component?"

  nodeId = parseInt(ui.nodesTreeView.selectedNodes[0].dataset.id)
  componentId = parseInt(event.target.parentElement.parentElement.dataset.componentId)

  socket.emit 'edit:assets', info.assetId, 'removeComponent', nodeId, componentId, (err) ->
    if err? then alert err; return
    return
  return

# Engine
createNodeActor = (node) ->
  parentNode = data.asset.nodes.parentNodesById[node.id]
  parentActor = ui.bySceneNodeId[parentNode.id].actor if parentNode?

  nodeActor = new SupEngine.Actor ui.gameInstance, node.name, parentActor
  nodeActor.threeObject.position.copy node.position
  nodeActor.threeObject.quaternion.copy node.orientation
  nodeActor.threeObject.scale.copy node.scale
  nodeActor.threeObject.updateMatrixWorld()
  new TransformMarker nodeActor

  ui.bySceneNodeId[node.id] = { actor: nodeActor, bySceneComponentId: {} }

  for component in node.components
    createNodeActorComponent node, component, nodeActor

  nodeActor

createNodeActorComponent = (sceneNode, sceneComponent, nodeActor) ->
  componentClass = SupEngine.editorComponents["#{sceneComponent.type}Marker"] ? SupEngine.componentPlugins[sceneComponent.type]
  actorComponent = new componentClass nodeActor

  ui.bySceneNodeId[sceneNode.id].bySceneComponentId[sceneComponent.id] =
    component: actorComponent
    componentUpdater: new componentClass.Updater data.projectClient, actorComponent, sceneComponent.config

  return

tick = ->
  # FIXME: decouple update interval from render interval
  ui.gameInstance.update()
  ui.gameInstance.draw()
  ui.tickAnimationFrameId = requestAnimationFrame tick
  return

# Load plugins
pluginsXHR = new XMLHttpRequest
pluginsXHR.open 'GET', '/plugins.json', false # Synchronous, could be made asynchronous
pluginsXHR.send null

if pluginsXHR.status != 200
  throw new Error "Could not get plugins list"

pluginPaths = JSON.parse(pluginsXHR.responseText)

async.each pluginPaths.all, (pluginName, pluginCallback) ->
  if pluginName == "sparklinlabs/scene" then pluginCallback(); return

  async.series [

    (cb) ->
      apiScript = document.createElement('script')
      apiScript.src = "/plugins/#{pluginName}/api.js"
      apiScript.addEventListener 'load', -> cb()
      apiScript.addEventListener 'error', -> cb()
      document.body.appendChild apiScript

    (cb) ->
      componentsScript = document.createElement('script')
      componentsScript.src = "/plugins/#{pluginName}/components.js"
      componentsScript.addEventListener 'load', -> cb()
      componentsScript.addEventListener 'error', -> cb()
      document.body.appendChild componentsScript

    (cb) ->
      componentEditorsScript = document.createElement('script')
      componentEditorsScript.src = "/plugins/#{pluginName}/componentEditors.js"
      componentEditorsScript.addEventListener 'load', -> cb()
      componentEditorsScript.addEventListener 'error', -> cb()
      document.body.appendChild componentEditorsScript

  ], pluginCallback
, (err) ->
  # Start
  start()
