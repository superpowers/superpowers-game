/// <reference path="../../../common/settings/settingsEditors/SettingsEditorPlugin.d.ts" />

import ProjectSettingsEditor from "./ProjectSettingsEditor";

SupClient.registerPlugin<SupClient.SettingsEditorPlugin>("settingsEditors", "Project", {
  namespace: "general",
  editor: ProjectSettingsEditor
});
