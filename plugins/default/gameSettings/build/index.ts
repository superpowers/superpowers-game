/// <reference path="./GameBuildSettings.d.ts" />

import GameBuildSettingsEditor from "./GameBuildSettingsEditor";
import buildGame from "./buildGame";

SupClient.registerPlugin<SupClient.BuildPlugin>("build", "game", {
  settingsEditor: GameBuildSettingsEditor,
  build: buildGame
});
