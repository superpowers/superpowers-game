exports.setupComponent = (player, component, config) ->
  if config.tileMapAssetId?
    tileMap = player.getOuterAsset config.tileMapAssetId
    component.setTileMap tileMap.__inner

  tileSetId = config.tileSetAssetId ? tileMap.__inner.data.tileSetId
  tileSet = player.getOuterAsset tileSetId
  component.setTileSet tileSet.__inner
  return
