module.exports = class Body2DConfig extends SupCore.data.base.ComponentConfig

  @schema =
    width: { type: 'number', mutable: true }
    height: { type: 'number', mutable: true }
    movable: { type: 'boolean', mutable: true }

  @create: ->
    width: 1
    height: 1
    movable: true

  constructor: (pub) ->
    super pub, @constructor.schema
