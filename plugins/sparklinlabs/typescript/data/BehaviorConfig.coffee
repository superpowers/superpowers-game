module.exports = class BehaviorConfig extends SupCore.data.base.ComponentConfig

  @schema =
    behaviorName: { type: 'string', mutable: true }
    propertyValues:
      type: 'hash'
      keys: { minLength: 1, maxLength: 80 }
      values:
        type: 'string'

  @create: ->
    behaviorName: ''
    propertyValues: {}

  constructor: (pub) ->
    pub.propertyValues ?= {}
    super pub, @constructor.schema
