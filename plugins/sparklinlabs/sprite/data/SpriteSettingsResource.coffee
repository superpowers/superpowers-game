path = require 'path'
fs = require 'fs'

module.exports = class SpriteSettingsResource extends SupCore.data.base.Resource

  @schema:
    filtering: { type: 'enum', items: [ 'pixelated', 'smooth' ], mutable: true }
    pixelsPerUnit: { type: 'number', min: 1, mutable: true }
    framesPerSecond: { type: 'number', min: 1, mutable: true }
    alphaTest: { type: 'number', min: 0, max: 1, mutable: true }

  constructor: (pub, serverData) ->
    super pub, @constructor.schema, serverData

  setup: -> return

  init: (callback) ->
    @pub =
      filtering: 'pixelated'
      pixelsPerUnit: 100
      framesPerSecond: 10
      alphaTest: 0.1

    super callback; return
