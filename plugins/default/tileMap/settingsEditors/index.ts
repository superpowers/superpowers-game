/// <reference path="../../../common/settings/settingsEditors/SettingsEditorPlugin.d.ts" />

import TileMapSettingsEditor from "./TileMapSettingsEditor";

SupClient.registerPlugin<SupClient.SettingsEditorPlugin>("settingsEditors", "TileMap", {
  namespace: "editors",
  editor: TileMapSettingsEditor
});
