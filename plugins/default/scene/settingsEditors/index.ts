/// <reference path="../../../common/settings/settingsEditors/SettingsEditorPlugin.d.ts" />

import SceneSettingsEditor from "./SceneSettingsEditor";

SupClient.registerPlugin<SupClient.SettingsEditorPlugin>("settingsEditors", "Scene", {
  namespace: "editors",
  editor: SceneSettingsEditor
});
