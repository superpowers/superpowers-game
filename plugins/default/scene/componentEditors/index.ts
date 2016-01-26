/// <reference path="ComponentEditorPlugin.d.ts" />
/// <reference path="ImportIntoScenePlugin.d.ts" />

import CameraEditor from "./CameraEditor";
import * as importPrefabIntoScene from "./importPrefabIntoScene";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "Camera", CameraEditor);
SupClient.registerPlugin<SupClient.ImportIntoScenePlugin>("importIntoScene", "scene", importPrefabIntoScene);
