SceneComponents = require './SceneComponents'

module.exports = class SceneNodes extends SupCore.api.base.TreeById

  @schema =
    name: { type: 'string', minLength: 1, maxLength: 80, mutable: true }
    children: { type: 'list' }

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

    components: { type: 'listById' }

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
    super id, (err) =>
      if err? then callback err; return
      
      config.destroy() for componentId, config of @componentsByNodeId[id].configsById
      delete @componentsByNodeId[id]
      
      callback(); return
    return

  addComponent: (id, component, index, callback) ->
    components = @componentsByNodeId[id]
    if ! components? then callback "Invalid node id: #{id}"; return

    components.add component, index, callback
    return

  client_addComponent: (id, component, index) ->
    @componentsByNodeId[id].client_add component, index
    return
