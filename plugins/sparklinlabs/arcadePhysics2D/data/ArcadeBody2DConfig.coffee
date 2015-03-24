module.exports = class ArcadeBody2DConfig extends SupCore.data.base.ComponentConfig

  @schema =
    width: { type: 'number', mutable: true }
    height: { type: 'number', mutable: true }
    offsetX: { type: 'number', mutable: true }
    offsetY: { type: 'number', mutable: true }
    movable: { type: 'boolean', mutable: true }

  @create: ->
    width: 1
    height: 1
    offsetX: 0
    offsetY: 0
    movable: true

  constructor: (pub) ->
    super pub, @constructor.schema

    @pub.offsetX ?= 0
    @pub.offsetY ?= 0
