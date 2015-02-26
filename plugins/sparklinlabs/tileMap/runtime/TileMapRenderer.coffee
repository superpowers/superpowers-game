exports.setupComponent = (player, component, config) ->
  if config.tileMapAssetId?
    tileMap = player.getOuterAsset config.tileMapAssetId
    component.setTileMap tileMap.__inner

  tileSetId = config.tileSetAssetId ? tileMap.__inner.data.tileSetId
  tileSet = player.getOuterAsset tileSetId
  component.setTileSet tileSet.__inner
  return

fs = require 'fs'
exports.typescript = fs.readFileSync __dirname + '/TileMapRenderer.ts', { encoding: 'utf8' }
exports.typescriptDefs = fs.readFileSync __dirname + '/TileMapRenderer.d.ts', { encoding: 'utf8' }
