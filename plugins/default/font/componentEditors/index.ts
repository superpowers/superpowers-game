/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />

import TextRendererEditor from "./TextRendererEditor";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "TextRenderer", TextRendererEditor);
