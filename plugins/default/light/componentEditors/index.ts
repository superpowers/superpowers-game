/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />

import LightEditor from "./LightEditor";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "Light", LightEditor);
