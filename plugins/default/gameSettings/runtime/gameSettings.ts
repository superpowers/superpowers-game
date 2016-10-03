export function init(player: SupRuntime.Player, callback: Function) {
  player.gameInstance.framesPerSecond = player.resources.gameSettings.framesPerSecond;
  SupRuntime.Player.updateInterval = 1000 / player.gameInstance.framesPerSecond;

  if (player.resources.gameSettings.ratioNumerator != null && player.resources.gameSettings.ratioDenominator != null) {
    player.gameInstance.setRatio(player.resources.gameSettings.ratioNumerator / player.resources.gameSettings.ratioDenominator);
  }

  // NOTE: Custom layers were introduced in Superpowers 0.8
  if (player.resources.gameSettings.customLayers != null) {
    player.gameInstance.layers = player.gameInstance.layers.concat(player.resources.gameSettings.customLayers);
  }

  callback();
}

export function lateStart(player: SupRuntime.Player, callback: Function) {
  const sceneId = player.resources.gameSettings.startupSceneId;
  if (sceneId != null) {
    const outerAsset = player.getOuterAsset(sceneId);
    if (outerAsset != null && outerAsset.type === "scene") (<any>window).Sup.loadScene(outerAsset);
  }
  callback();
}
