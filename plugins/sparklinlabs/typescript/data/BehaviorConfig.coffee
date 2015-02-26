module.exports = class BehaviorConfig extends SupCore.data.base.ComponentConfig

  @schema =
    behaviorName: { type: 'string', mutable: true }

  @create: ->
    behaviorName: ''

  constructor: (pub) ->
    super pub, @constructor.schema
