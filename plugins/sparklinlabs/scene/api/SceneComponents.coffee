module.exports = class SceneComponents extends SupCore.api.base.ListById

  @schema =
    type: { type: 'string' }
    config: { type: 'any' }

  constructor: (pub) ->
    super pub, @constructor.schema

    @configsById = {}

    for item in @pub
      componentConfigClass = SupCore.api.componentConfigPlugins[item.type]
      @configsById[item.id] = new componentConfigClass item.config

  add: (component, index, callback) ->
    super component, index, (err, actualIndex) =>
      if err? then callback err; return

      componentConfigClass = SupCore.api.componentConfigPlugins[component.type]
      @configsById[component.id] = new componentConfigClass component.config

      callback null, actualIndex
      return
    return

  client_add: (component, index) ->
    super component, index

    componentConfigClass = SupCore.api.componentConfigPlugins[component.type]
    @configsById[component.id] = new componentConfigClass component.config
    return

  remove: (id, callback) ->
    super id, (err) =>
      if err? then callback err; return

      @configsById[id].destroy()
      delete @configsById[id]

      callback null
      return
    return

  client_remove: (id) ->
    super id
    delete @configsById[id]
    return
