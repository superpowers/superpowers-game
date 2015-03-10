exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', callback
  return

exports.createOuterAsset = (player, asset) ->
  return new window.Sup.Scene asset
