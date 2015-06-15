import SceneSettingsResource from "./SceneSettingsResource";
import SceneAsset from "./SceneAsset";
import CameraConfig from "./CameraConfig";

SupCore.data.registerResource("sceneSettings", SceneSettingsResource);
SupCore.data.registerAssetClass("scene", SceneAsset);
SupCore.data.registerComponentConfigClass("Camera", CameraConfig);
