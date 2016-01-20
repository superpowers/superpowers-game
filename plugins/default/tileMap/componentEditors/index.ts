/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />

import TileMapRendererEditor from "./TileMapRendererEditor";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "TileMapRenderer", TileMapRendererEditor);
