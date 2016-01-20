/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />

import ModelRendererEditor from "./ModelRendererEditor";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "ModelRenderer", ModelRendererEditor);
