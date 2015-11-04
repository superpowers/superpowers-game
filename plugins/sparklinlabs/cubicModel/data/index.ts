import CubicModelSettingsResource from "./CubicModelSettingsResource";
import CubicModelAsset from "./CubicModelAsset";
import CubicModelRendererConfig from "./CubicModelRendererConfig";

SupCore.data.registerResource("cubicModelSettings", CubicModelSettingsResource);
SupCore.data.registerAssetClass("cubicModel", CubicModelAsset);
SupCore.data.registerComponentConfigClass("CubicModelRenderer", CubicModelRendererConfig);
