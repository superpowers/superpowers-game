/// <reference path="../../../common/settings/settingsEditors/SettingsEditorPlugin.d.ts" />

import GameSettingsEditor from "./GameSettingsEditor";

SupClient.registerPlugin<SupClient.SettingsEditorPlugin>("settingsEditors", "Game", {
  namespace: "general",
  editor: GameSettingsEditor
});
