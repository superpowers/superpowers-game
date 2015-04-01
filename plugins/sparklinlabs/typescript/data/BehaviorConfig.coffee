module.exports = class BehaviorConfig extends SupCore.data.base.ComponentConfig

  @schema =
    behaviorName: { type: 'string', mutable: true }
    propertyValues:
      type: 'hash'
      keys: { minLength: 1, maxLength: 80 }
      values: { type: 'any' }

  @create: ->
    behaviorName: ''
    propertyValues: {}

  constructor: (pub) ->
    pub.propertyValues ?= {}
    super pub, @constructor.schema

  server_setBehaviorPropertyValue: (name, value, callback) ->
    @pub.propertyValues[name] = value
    callback null, name, value; return

  client_setBehaviorPropertyValue: (name, value) ->
    @pub.propertyValues[name] = value; return

  server_clearBehaviorPropertyValue: (name, callback) ->
    delete @pub.propertyValues[name]
    callback null, name; return

  client_clearBehaviorPropertyValue: (name) ->
    delete @pub.propertyValues[name]; return
