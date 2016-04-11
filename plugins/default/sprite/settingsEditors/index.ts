/// <reference path="../../../common/settings/settingsEditors/SettingsEditorPlugin.d.ts" />

import SpriteSettingsEditor from "./SpriteSettingsEditor";

SupClient.registerPlugin<SupClient.SettingsEditorPlugin>("settingsEditors", "Sprite", {
  namespace: "editors",
  editor: SpriteSettingsEditor
});
