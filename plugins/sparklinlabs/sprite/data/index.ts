import SpriteSettingsResource from "./SpriteSettingsResource";
import SpriteAsset from "./SpriteAsset";
import SpriteRendererConfig from "./SpriteRendererConfig";

SupCore.system.data.registerResource("spriteSettings", SpriteSettingsResource);
SupCore.system.data.registerAssetClass("sprite", SpriteAsset);
SupCore.system.data.registerComponentConfigClass("SpriteRenderer", SpriteRendererConfig);
