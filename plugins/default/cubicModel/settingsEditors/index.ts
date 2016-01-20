/// <reference path="../../../common/settings/settingsEditors/SettingsEditorPlugin.d.ts" />

import CubicModelSettingsEditor from "./CubicModelSettingsEditor";

SupClient.registerPlugin<SupClient.SettingsEditorPlugin>("settingsEditors", "CubicModel", {
  namespace: "editors",
  editor: CubicModelSettingsEditor
});
