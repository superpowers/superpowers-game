/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />
/// <reference path="../../scene/componentEditors/ImportIntoScenePlugin.d.ts" />

import TileMapRendererEditor from "./TileMapRendererEditor";
import importTileMapIntoScene from "./importTileMapIntoScene";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "TileMapRenderer", TileMapRendererEditor);
SupClient.registerPlugin<SupClient.ImportIntoScenePlugin>("importIntoScene", "tileMap", importTileMapIntoScene);
