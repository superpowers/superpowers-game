export function start(player: SupRuntime.Player, callback: Function) {
  SupEngine.GameInstance.framesPerSecond = player.resources.gameSettings.framesPerSecond;
  SupRuntime.Player.updateInterval = 1 / SupEngine.GameInstance.framesPerSecond * 1000;

  if (player.resources.gameSettings.ratioNumerator != null) {
    player.gameInstance.ratio = player.resources.gameSettings.ratioNumerator / player.resources.gameSettings.ratioDenominator;
  }
  else {
    player.gameInstance.threeRenderer.domElement.style.margin = "0";
    player.gameInstance.threeRenderer.domElement.style.flex = "1";
  }
  callback();
}
