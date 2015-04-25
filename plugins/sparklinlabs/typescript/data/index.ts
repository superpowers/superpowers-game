import BehaviorPropertiesResource from "./BehaviorPropertiesResource";
import ScriptAsset from "./ScriptAsset";
import BehaviorConfig from "./BehaviorConfig";

SupCore.data.registerResource("behaviorProperties", BehaviorPropertiesResource);
SupCore.data.registerAssetClass("script", ScriptAsset);
SupCore.data.registerComponentConfigClass("Behavior", BehaviorConfig);
