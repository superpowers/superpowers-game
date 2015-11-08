import LightConfig from "./LightConfig";
import LightSettingsResource from "./LightSettingsResource";

SupCore.system.data.registerComponentConfigClass("Light", LightConfig);
SupCore.system.data.registerResource("lightSettings", LightSettingsResource);
