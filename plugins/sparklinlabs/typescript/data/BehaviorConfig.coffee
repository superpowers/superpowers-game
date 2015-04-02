module.exports = class BehaviorConfig extends SupCore.data.base.ComponentConfig

  @schema =
    behaviorName: { type: 'string', mutable: true }
    propertyValues:
      type: 'hash'
      keys: { minLength: 1, maxLength: 80 }
      values:
        type: 'hash'
        properties:
          type: { type: 'string' }
          value: { type: 'any' }

  @create: ->
    behaviorName: ''
    propertyValues: {}

  constructor: (pub) ->
    pub.propertyValues ?= {}
    super pub, @constructor.schema

  server_setBehaviorPropertyValue: (client, name, type, value, callback) ->
    @pub.propertyValues[name] = { type, value }
    callback null, name, type, value; return

  client_setBehaviorPropertyValue: (name, type, value) ->
    @pub.propertyValues[name] = { type, value }; return

  server_clearBehaviorPropertyValue: (client, name, callback) ->
    delete @pub.propertyValues[name]
    callback null, name; return

  client_clearBehaviorPropertyValue: (name) ->
    delete @pub.propertyValues[name]; return
