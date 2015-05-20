export function init(player: SupRuntime.Player, callback: Function) {
  SupEngine.GameInstance.framesPerSecond = player.resources.gameSettings.framesPerSecond;
  SupRuntime.Player.updateInterval = 1 / SupEngine.GameInstance.framesPerSecond * 1000;

  if (player.resources.gameSettings.ratioNumerator != null && player.resources.gameSettings.ratioDenominator != null) {
    player.gameInstance.setRatio(player.resources.gameSettings.ratioNumerator / player.resources.gameSettings.ratioDenominator);
  }
  callback();
}

export function lateStart(player: SupRuntime.Player, callback: Function) {
  let scene = player.resources.gameSettings.startupScene;
  if (scene != null) (<any>window).Sup.loadScene(scene);
  callback();
}
