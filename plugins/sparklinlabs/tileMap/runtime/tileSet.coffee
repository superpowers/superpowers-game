TileSet = require '../components/TileSet'
exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) =>
    img = new Image()

    img.onload = ->
      data.texture = new SupEngine.THREE.Texture img
      data.texture.needsUpdate = true
      data.texture.magFilter = SupEngine.THREE.NearestFilter
      data.texture.minFilter = SupEngine.THREE.NearestFilter

      callback null, new TileSet data
      return

    img.onerror = -> callback null, new TileSet data; return

    img.src = "#{player.dataURL}assets/#{entry.id}/image.dat"
    return
  return

exports.createOuterAsset = (player, asset) ->
  return new player.Sup.TileSet asset

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
    getTileProperties(tile: number): {[key:string]: string;}
  }
}
"""
