/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />
/// <reference path="../../scene/componentEditors/ImportIntoScenePlugin.d.ts" />

import BehaviorEditor from "./BehaviorEditor";
import * as importBehaviorIntoScene from "./importBehaviorIntoScene";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "Behavior", BehaviorEditor);
SupClient.registerPlugin<SupClient.ImportIntoScenePlugin>("importIntoScene", "script", importBehaviorIntoScene);
