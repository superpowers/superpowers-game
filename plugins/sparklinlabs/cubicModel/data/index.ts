import CubicModelSettingsResource from "./CubicModelSettingsResource";
import CubicModelAsset from "./CubicModelAsset";
import CubicModelRendererConfig from "./CubicModelRendererConfig";

SupCore.system.data.registerResource("cubicModelSettings", CubicModelSettingsResource);
SupCore.system.data.registerAssetClass("cubicModel", CubicModelAsset);
SupCore.system.data.registerComponentConfigClass("CubicModelRenderer", CubicModelRendererConfig);
