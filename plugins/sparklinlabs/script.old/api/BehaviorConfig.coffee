module.exports = class BehaviorConfig extends SupCore.api.base.ComponentConfig

  @schema =
    behaviorName: { type: 'string', mutable: true }

  @create: ->
    behaviorName: ''

  constructor: (pub) ->
    super pub, @constructor.schema
