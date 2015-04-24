{ EventEmitter } = require 'events'

module.exports = class TileMap extends EventEmitter
  @emptyTile: [-1, -1, false, false, 0]

  constructor: (@data) ->

  getWidth: -> @data.width
  getHeight: -> @data.height
  getPixelsPerUnit: -> @data.pixelsPerUnit

  setTileAt: (layer, x, y, value) ->
    return if x < 0 or y < 0 or x >= @data.width or y >= @data.height

    index = y * @data.width + x
    @data.layers[layer].data[index] = value ? @constructor.emptyTile

    @emit 'setTileAt', layer, x, y
    return

  getTileAt: (layer, x, y) ->
    return @constructor.emptyTile if x < 0 or y < 0 or x >= @data.width or y >= @data.height

    index = y * @data.width + x
    return @data.layers[layer].data[index]
