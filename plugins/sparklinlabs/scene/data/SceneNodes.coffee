SceneComponents = require './SceneComponents'

module.exports = class SceneNodes extends SupCore.data.base.TreeById

  @schema =
    name: { type: 'string', minLength: 1, maxLength: 80, mutable: true }
    children: { type: 'array' }

    position:
      mutable: true
      type: 'hash'
      properties:
        x: { type: 'number', mutable: true }
        y: { type: 'number', mutable: true }
        z: { type: 'number', mutable: true }

    orientation:
      mutable: true
      type: 'hash'
      properties:
        x: { type: 'number', mutable: true }
        y: { type: 'number', mutable: true }
        z: { type: 'number', mutable: true }
        w: { type: 'number', mutable: true }

    scale:
      mutable: true
      type: 'hash'
      properties:
        x: { type: 'number', mutable: true }
        y: { type: 'number', mutable: true }
        z: { type: 'number', mutable: true }

    components: { type: 'array' }

  constructor: (pub) ->
    super pub, @constructor.schema

    @componentsByNodeId = {}

    @walk (node, parentNode) =>
      @componentsByNodeId[node.id] = new SceneComponents node.components
      return

  add: (node, parentId, index, callback) ->
    super node, parentId, index, (err, actualIndex) =>
      if err? then callback err; return

      components = new SceneComponents node.components
      @componentsByNodeId[node.id] = components
      node.components = components.pub

      callback null, actualIndex
      return
    return

  client_add: (node, parentId, index) ->
    super node, parentId, index
    @componentsByNodeId[node.id] = new SceneComponents node.components
    return

  remove: (id, callback) ->
    node = @byId[id]
    if ! node? then callback("Invalid node id: #{id}"); return

    @walkNode node, null, (node) =>
      config.destroy() for componentId, config of @componentsByNodeId[node.id].configsById
      delete @componentsByNodeId[node.id]
      return

    super id, callback
    return

  client_remove: (id) ->
    node = @byId[id]

    @walkNode node, null, (node) =>
      config.destroy() for componentId, config of @componentsByNodeId[node.id].configsById
      delete @componentsByNodeId[node.id]
      return

    super id
    return

  addComponent: (id, component, index, callback) ->
    components = @componentsByNodeId[id]
    if ! components? then callback "Invalid node id: #{id}"; return

    components.add component, index, callback
    return

  client_addComponent: (id, component, index) ->
    @componentsByNodeId[id].client_add component, index
    return
