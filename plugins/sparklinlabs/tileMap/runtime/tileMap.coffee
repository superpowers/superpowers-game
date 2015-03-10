TileMap = require '../components/TileMap'
exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) ->
    callback null, new TileMap data
    return
  return

exports.createOuterAsset = (player, asset) ->
  return new window.Sup.TileMap asset
