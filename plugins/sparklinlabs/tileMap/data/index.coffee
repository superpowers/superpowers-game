SupCore.data.registerResource "tileMapSettings", require "./TileMapSettingsResource"
SupCore.data.registerAssetClass 'tileMap', require './TileMapAsset'
SupCore.data.registerAssetClass 'tileSet', require './TileSetAsset'

SupCore.data.registerComponentConfigClass 'TileMapRenderer', require './TileMapRendererConfig'
