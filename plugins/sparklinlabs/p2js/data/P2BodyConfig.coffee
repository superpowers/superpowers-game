module.exports = class P2BodyConfig extends SupCore.data.base.ComponentConfig

  @schema =
    mass: { type: 'number', min: 0, mutable: true }
    fixedRotation: { type: 'boolean', mutable: true }
    offsetX: { type: 'number', mutable: true }
    offsetY: { type: 'number', mutable: true }
    shape: { type: 'enum', items: ['rectangle', 'circle'], mutable: true }
    width: { type: 'number', min: 0, mutable: true }
    height: { type: 'number', min: 0, mutable: true }
    radius: { type: 'number', min: 0, mutable: true }

  @create: ->
    mass: 0
    fixedRotation: false
    offsetX: 0
    offsetY: 0
    shape: 'rectangle'
    width: 1
    height: 1
    radius: 1
    length: 1

  constructor: (pub) ->
    super pub, @constructor.schema
