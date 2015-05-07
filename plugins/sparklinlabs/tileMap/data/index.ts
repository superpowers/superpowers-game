import TileMapSettingsResource from "./TileMapSettingsResource";
import TileMapAsset from "./TileMapAsset";
import TileSetAsset from "./TileSetAsset";
import TileMapRendererConfig from "./TileMapRendererConfig";

SupCore.data.registerResource("tileMapSettings", TileMapSettingsResource);
SupCore.data.registerAssetClass("tileMap", TileMapAsset);
SupCore.data.registerAssetClass("tileSet", TileSetAsset);
SupCore.data.registerComponentConfigClass("TileMapRenderer", TileMapRendererConfig);
