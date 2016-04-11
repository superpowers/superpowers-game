/// <reference path="../../../common/settings/settingsEditors/SettingsEditorPlugin.d.ts" />

import LightSettingsEditor from "./LightSettingsEditor";

SupClient.registerPlugin<SupClient.SettingsEditorPlugin>("settingsEditors", "Light", {
  namespace: "editors",
  editor: LightSettingsEditor
});
