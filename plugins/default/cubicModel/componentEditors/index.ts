/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />

import CubicModelRendererEditor from "./CubicModelRendererEditor";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "CubicModelRenderer", CubicModelRendererEditor);
