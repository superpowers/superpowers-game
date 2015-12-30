import BehaviorPropertiesResource from "./BehaviorPropertiesResource";
import ScriptAsset from "./ScriptAsset";
import BehaviorConfig from "./BehaviorConfig";

SupCore.system.data.registerResource("behaviorProperties", BehaviorPropertiesResource);
SupCore.system.data.registerAssetClass("script", ScriptAsset);
SupCore.system.data.registerComponentConfigClass("Behavior", BehaviorConfig);
