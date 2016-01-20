/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />

import BehaviorEditor from "./BehaviorEditor";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "Behavior", BehaviorEditor);
