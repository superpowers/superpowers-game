/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />
/// <reference path="../../scene/componentEditors/ImportIntoScenePlugin.d.ts" />

import ModelRendererEditor from "./ModelRendererEditor";
import importModelIntoScene from "./importModelIntoScene";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "ModelRenderer", ModelRendererEditor);
SupClient.registerPlugin<SupClient.ImportIntoScenePlugin>("importIntoScene", "model", importModelIntoScene);
