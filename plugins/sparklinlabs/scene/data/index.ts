import SceneSettingsResource from "./SceneSettingsResource";
import SceneAsset from "./SceneAsset";
import CameraConfig from "./CameraConfig";

SupCore.system.data.registerResource("sceneSettings", SceneSettingsResource);
SupCore.system.data.registerAssetClass("scene", SceneAsset);
SupCore.system.data.registerComponentConfigClass("Camera", CameraConfig);
