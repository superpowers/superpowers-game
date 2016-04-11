import * as script from "./script";
import * as Behavior from "./Behavior";
import * as behaviorProperties from "./behaviorProperties";

SupRuntime.registerPlugin("script", script);
SupRuntime.registerPlugin("Behavior", Behavior);
SupRuntime.registerResource("behaviorProperties", behaviorProperties);
