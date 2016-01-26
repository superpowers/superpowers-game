/// <reference path="../../scene/componentEditors/ComponentEditorPlugin.d.ts" />
/// <reference path="../../scene/componentEditors/ImportIntoScenePlugin.d.ts" />

import SpriteRendererEditor from "./SpriteRendererEditor";
import * as importSpriteIntoScene from "./importSpriteIntoScene";

SupClient.registerPlugin<SupClient.ComponentEditorPlugin>("componentEditors", "SpriteRenderer", SpriteRendererEditor);
SupClient.registerPlugin<SupClient.ImportIntoScenePlugin>("importIntoScene", "sprite", importSpriteIntoScene);
