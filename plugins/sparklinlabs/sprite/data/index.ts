import SpriteSettingsResource from "./SpriteSettingsResource";
import SpriteAsset from "./SpriteAsset";
import SpriteRendererConfig from "./SpriteRendererConfig";

SupCore.data.registerResource("spriteSettings", SpriteSettingsResource);
SupCore.data.registerAssetClass("sprite", SpriteAsset);
SupCore.data.registerComponentConfigClass("SpriteRenderer", SpriteRendererConfig);
