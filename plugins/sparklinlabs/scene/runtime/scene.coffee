exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', callback
  return

exports.createOuterAsset = (player, asset) ->
  return new player.Sup.Scene asset
