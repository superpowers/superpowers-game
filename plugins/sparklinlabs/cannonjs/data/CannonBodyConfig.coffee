module.exports = class CannonBodyConfig extends SupCore.data.base.ComponentConfig

  @schema =
    mass: { type: 'number', min: 0, mutable: true }
    fixedRotation: { type: 'boolean', mutable: true }
    halfWidth: { type: 'number', min: 0, mutable: true }
    halfHeight: { type: 'number', min: 0, mutable: true }
    halfDepth: { type: 'number', min: 0, mutable: true }
    offsetX: { type: 'number', mutable: true }
    offsetY: { type: 'number', mutable: true }
    offsetZ: { type: 'number', mutable: true }

  @create: ->
    mass: 0
    fixedRotation: true
    halfWidth: 0.5
    halfHeight: 0.5
    halfDepth: 0.5
    offsetX: 0
    offsetY: 0
    offsetZ: 0

  constructor: (pub) ->
    super pub, @constructor.schema
