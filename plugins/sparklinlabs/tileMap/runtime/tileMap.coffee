TileMap = require '../components/TileMap'

exports.script =
  """
  namespace Sup
    blueprint TileMap
      transcendental construct(Dictionary inner)

      transcendental action getWidth(): number
      transcendental action getHeight(): number

      transcendental action setTileAt(number layer, number x, number y, number value, boolean? flipX, boolean? flipY, number? angle)
      transcendental action getTileAt(number layer, number x, number y): number
      transcendental action getTileTransformAt(number layer, number x, number y): Dictionary
  """

exports.js = (player) ->
  'Sup':
    'TileMap':
      'construct': (inner) ->
        @__inner = inner
        inner.__outer = @
        return

      'prototype':
        'getWidth': -> @__inner.getWidth()
        'getHeight': -> @__inner.getHeight()

        'setTileAt': (layer, x, y, value, flipX=false, flipY=false, angle=0) ->
          tileSet = player.getOuterAsset @.__inner.data.tileSetId
          tilesPerRow = tileSet.__inner.data.texture.image.width / tileSet.__inner.data.gridSize
          if value == -1
            @__inner.setTileAt layer, x, y, null
          else
            @__inner.setTileAt layer, x, y, [value % tilesPerRow, Math.floor(value / tilesPerRow), flipX, flipY, angle]
          return

        'getTileAt': (layer, x, y) ->
          tileSet = player.getOuterAsset @.__inner.data.tileSetId
          tilesPerRow = tileSet.__inner.data.texture.image.width / tileSet.__inner.data.gridSize
          [tileX, tileY] = @__inner.getTileAt layer, x, y
          if tileX == -1 and tileY == -1
            return -1
          else
            return tileY * tilesPerRow + tileX

        'getTileTransformAt': (layer, x, y) ->
          tileSet = player.getOuterAsset @.__inner.data.tileSetId
          tilesPerRow = tileSet.__inner.data.texture.image.width / tileSet.__inner.data.gridSize
          [tileX, tileY, flipX, flipY, angle] = @__inner.getTileAt layer, x, y
          return { flipX, flipY, angle }

exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) ->
    callback null, new TileMap data
    return
  return

exports.createOuterAsset = (player, asset) ->
  return new player.scriptRoot.Sup.TileMap asset
