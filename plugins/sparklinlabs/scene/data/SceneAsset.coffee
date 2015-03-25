serverRequire = require
if ! window? then SupEngine = serverRequire '../../../../system/SupEngine'

path = require 'path'
fs = require 'fs'
_ = require 'lodash'

SceneNodes = require './SceneNodes'

module.exports = class SceneAsset extends SupCore.data.base.Asset

  @schema =
    nodes: { type: 'treeById' }

  constructor: (pub) ->
    @componentPathsByDependentAssetId = {}

    super pub, @constructor.schema

  init: (callback) ->
    @pub = nodes: []
    super callback; return

  setup: ->
    @nodes = new SceneNodes @pub.nodes

    for nodeId, components of @nodes.componentsByNodeId
      for componentId, config of components.configsById
        componentPath = "#{nodeId}_#{componentId}"
        do (componentPath) =>
          config.on 'addDependencies', (depIds) => @_onAddComponentDependencies componentPath, depIds; return
          config.on 'removeDependencies', (depIds) => @_onRemoveComponentDependencies componentPath, depIds; return
          return
        config.restore()

    return

  # NOTE: We're restore()'ing all the components during @setup() since we need
  # to rebuild @componentPathsByDependentAssetId every time the scene asset
  # is loaded.
  #
  # It's a bit weird but it all works out since @setup() is called right before
  # @restore() anyway.
  restore: ->
    @emit 'addDependencies', Object.keys(@componentPathsByDependentAssetId)
    return

  server_addNode: (client, name, options, callback) ->
    sceneNode =
      name: name, children: [], components: []
      position: options?.transform?.position ? { x: 0, y: 0, z: 0 }
      orientation: options?.transform?.orientation ? { x: 0, y: 0, z: 0, w: 1 }
      scale: options?.transform?.scale ? { x: 1, y: 1, z: 1 }

    @nodes.add sceneNode, options?.parentId, options?.index, (err, actualIndex) =>
      if err? then callback? err; return

      callback null, sceneNode, options?.parentId, actualIndex
      @emit 'change'
      return
    return

  client_addNode: (node, parentId, index) ->
    @nodes.client_add node, parentId, index
    return

  server_setNodeProperty: (client, id, path, value, callback) ->
    @nodes.setProperty id, path, value, (err, actualValue) =>
      if err? then callback? err; return
      
      callback null, id, path, actualValue
      @emit 'change'
      return
    return

  client_setNodeProperty: (id, path, value) ->
    @nodes.client_setProperty id, path, value
    return

  server_moveNode: (client, id, parentId, index, callback) ->
    node = @nodes.byId[id]
    if ! node? then callback "Invalid node id: #{id}"; return

    globalMatrix = @computeGlobalMatrix node

    @nodes.move id, parentId, index, (err, actualIndex) =>
      if err? then callback? err; return

      @applyGlobalMatrix node, globalMatrix
      
      callback null, id, parentId, actualIndex
      @emit 'change'
      return
    return

  computeGlobalMatrix: (node) ->
    matrix = new SupEngine.THREE.Matrix4().compose node.position, node.orientation, node.scale

    parentNode = @nodes.parentNodesById[node.id]
    if parentNode?
      parentGlobalMatrix = @computeGlobalMatrix parentNode
      matrix.multiplyMatrices parentGlobalMatrix, matrix

    matrix

  applyGlobalMatrix: (node, matrix) ->
    parentNode = @nodes.parentNodesById[node.id]
    if parentNode?
      parentGlobalMatrix = @computeGlobalMatrix parentNode
      matrix.multiplyMatrices new SupEngine.THREE.Matrix4().getInverse(parentGlobalMatrix), matrix
    
    position = new SupEngine.THREE.Vector3()
    orientation = new SupEngine.THREE.Quaternion()
    scale = new SupEngine.THREE.Vector3()
    matrix.decompose position, orientation, scale
    node.position = { x: position.x, y: position.y, z: position.z }
    node.orientation = { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w }
    node.scale = { x: scale.x, y: scale.y, z: scale.z }
    return

  client_moveNode: (id, parentId, index) ->
    @nodes.client_move id, parentId, index
    return
  
  server_duplicateNode: (client, newName, id, index, callback) ->
    referenceNode = @nodes.byId[id]
    if ! referenceNode? then callback "Invalid node id: #{id}"; return

    newNodes = []
    totalNodeCount = 0
    walk = (node) =>
      totalNodeCount += 1
      walk childNode for childNode in node.children
      return
    walk referenceNode

    addNode = (newNode, parentId, index, children) =>
      @nodes.add newNode, parentId, index, (err, actualIndex) =>
        if err? then callback? err; return

        for componentId, config of @nodes.componentsByNodeId[newNode.id].configsById
          componentPath = "#{newNode.id}_#{componentId}"
          do (componentPath) =>
            config.on 'addDependencies', (depIds) => @_onAddComponentDependencies componentPath, depIds; return
            config.on 'removeDependencies', (depIds) => @_onRemoveComponentDependencies componentPath, depIds; return
            return
          config.restore()

        newNodes.push
          node: newNode
          parentId: parentId
          index: actualIndex

        if newNodes.length == totalNodeCount
          callback null, rootNode, newNodes
          @emit 'change'

        for childNode, childIndex in children
          node =
            name: childNode.name, children: []
            components: _.cloneDeep childNode.components
            position: _.cloneDeep childNode.position
            orientation: _.cloneDeep childNode.orientation
            scale: _.cloneDeep childNode.scale
          addNode node, newNode.id, childIndex, childNode.children
        return
      return

    rootNode =
      name: newName, children: []
      components: _.cloneDeep referenceNode.components
      position: _.cloneDeep referenceNode.position
      orientation: _.cloneDeep referenceNode.orientation
      scale: _.cloneDeep referenceNode.scale
    parentNode = @nodes.parentNodesById[id]

    addNode rootNode, parentNode?.id, index, referenceNode.children
    return

  client_duplicateNode: (rootNode, newNodes) ->
    for newNode in newNodes
      newNode.node.children.length = 0
      @nodes.client_add newNode.node, newNode.parentId, newNode.index
    return

  server_removeNode: (client, id, callback) ->
    @nodes.remove id, (err) =>
      if err? then callback? err; return

      callback null, id
      @emit 'change'
      return
    return

  client_removeNode: (id, callback) ->
    @nodes.client_remove id
    return

  # Components
  _onAddComponentDependencies: (componentPath, depIds) =>
    #console.log "Adding component dependencies: #{componentPath} - #{depIds}"
    addedDepIds = []

    for depId in depIds
      componentPaths = (@componentPathsByDependentAssetId[depId] ?= [])
      if componentPaths.indexOf(componentPath) == -1
        componentPaths.push componentPath
        addedDepIds.push depId if componentPaths.length == 1

    if addedDepIds.length > 0
      @emit 'addDependencies', addedDepIds
    return

  _onRemoveComponentDependencies: (componentPath, depIds) =>
    #console.log "Removing component dependencies: #{componentPath} - #{depIds}"
    removedDepIds = []

    for depId in depIds
      componentPaths = @componentPathsByDependentAssetId[depId]
      index = componentPaths?.indexOf(componentPath)
      if index? and index != -1
        componentPaths.splice index, 1

        if componentPaths.length == 0
          removedDepIds.push depId
          delete @componentPathsByDependentAssetId[depId]

    if removedDepIds.length > 0
      @emit 'removeDependencies', removedDepIds
    return

  server_addComponent: (client, nodeId, componentType, index, callback) ->
    componentConfigClass = SupCore.data.componentConfigClasses[componentType]
    if ! componentConfigClass? then callback "Invalid component type"; return

    component =
      type: componentType
      config: componentConfigClass.create()

    @nodes.addComponent nodeId, component, index, (err, actualIndex) =>
      if err? then callback? err; return

      config = @nodes.componentsByNodeId[nodeId].configsById[component.id]

      componentPath = "#{nodeId}_#{component.id}"
      config.on 'addDependencies', (depIds) => @_onAddComponentDependencies componentPath, depIds; return
      config.on 'removeDependencies', (depIds) => @_onRemoveComponentDependencies componentPath, depIds; return

      callback null, nodeId, component, actualIndex
      @emit 'change'
      return
    return

  client_addComponent: (nodeId, component, index) ->
    @nodes.client_addComponent nodeId, component, index
    return

  server_setComponentProperty: (client, nodeId, componentId, path, value, callback) ->
    components = @nodes.componentsByNodeId[nodeId]
    if ! components? then callback "Invalid node id: #{nodeId}"; return

    componentConfig = components.configsById[componentId]
    if ! componentConfig? then callback "Invalid component id: #{componentId}"; return

    componentConfig.setProperty path, value, (err, actualValue) =>
      if err? then callback? err; return
      
      callback null, nodeId, componentId, path, actualValue
      @emit 'change'
      return
    return

  client_setComponentProperty: (nodeId, componentId, path, value) ->
    componentConfig = @nodes.componentsByNodeId[nodeId].configsById[componentId]
    componentConfig.client_setProperty path, value
    return

  server_removeComponent: (client, nodeId, componentId, callback) ->
    components = @nodes.componentsByNodeId[nodeId]
    if ! components? then callback "Invalid node id: #{nodeId}"; return

    components.remove componentId, (err) =>
      if err? then callback? err; return
      
      callback null, nodeId, componentId
      @emit 'change'
      return
    return

  client_removeComponent: (nodeId, componentId) ->
    @nodes.componentsByNodeId[nodeId].client_remove componentId
    return
