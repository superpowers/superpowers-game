/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />
/// <reference path="../../scene/componentEditors/ImportIntoScenePlugin.d.ts" />

import CubicModelRendererEditor from "./CubicModelRendererEditor";
import importCubicModelIntoScene from "./importCubicModelIntoScene";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "CubicModelRenderer", CubicModelRendererEditor);
SupClient.registerPlugin<SupClient.ImportIntoScenePlugin>("importIntoScene", "cubicModel", importCubicModelIntoScene);
