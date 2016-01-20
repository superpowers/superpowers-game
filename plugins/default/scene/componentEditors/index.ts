/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />

import CameraEditor from "./CameraEditor";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "Camera", CameraEditor);
