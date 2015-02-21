THREE = SupEngine.THREE
TileSet = require '../components/TileSet'

exports.typescript = """
module Sup {
  export class TileSet extends Asset {
    getTileProperties(tile) {
      var tilesPerRow = this.__inner.data.texture.image.width / this.__inner.data.gridSize;

      var x = tile % tilesPerRow;
      var y = jsMath.floor(tile / tilesPerRow);
      var properties = this.__inner.data.tileProperties[x + "_" + y];
      properties = (properties) ? properties : {}
      return properties
    }
  }
}
"""


exports.typescriptDefs = """
declare module Sup {
  class TileSet extends Asset {
    getTileProperties(tile: number): {[key:string]: any;}
  }
}
"""

exports.script =
  """
  namespace Sup
    blueprint TileSet
      transcendental construct(Dictionary inner)

      transcendental action getTileProperties(number tile): Dictionary
  """

exports.js = (player) ->
  'Sup':
    'TileSet':
      'construct': (inner) ->
        @__inner = inner
        inner.__outer = @
        return

      'prototype':
        'getTileProperties': (tile) ->
          tilesPerRow = @__inner.data.texture.image.width / @__inner.data.gridSize

          x = tile % tilesPerRow
          y = Math.floor(tile / tilesPerRow)
          return @__inner.data.tileProperties["#{x}_#{y}"] ? {}

exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) =>
    img = new Image()

    img.onload = ->
      data.texture = new THREE.Texture img
      data.texture.needsUpdate = true
      data.texture.magFilter = THREE.NearestFilter
      data.texture.minFilter = THREE.NearestFilter

      callback null, new TileSet data
      return

    img.onerror = -> callback null, new TileSet data; return

    img.src = "#{player.dataURL}assets/#{entry.id}/image.dat"
    return
  return

exports.createOuterAsset = (player, asset) ->
  return new player.Sup.TileSet asset
