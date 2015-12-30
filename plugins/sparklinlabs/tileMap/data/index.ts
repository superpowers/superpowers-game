import TileMapSettingsResource from "./TileMapSettingsResource";
import TileMapAsset from "./TileMapAsset";
import TileSetAsset from "./TileSetAsset";
import TileMapRendererConfig from "./TileMapRendererConfig";

SupCore.system.data.registerResource("tileMapSettings", TileMapSettingsResource);
SupCore.system.data.registerAssetClass("tileMap", TileMapAsset);
SupCore.system.data.registerAssetClass("tileSet", TileSetAsset);
SupCore.system.data.registerComponentConfigClass("TileMapRenderer", TileMapRendererConfig);
