export function init(player: SupRuntime.Player, callback: Function) {
  SupEngine.GameInstance.framesPerSecond = player.resources.gameSettings.framesPerSecond;
  SupRuntime.Player.updateInterval = 1 / SupEngine.GameInstance.framesPerSecond * 1000;

  if (player.resources.gameSettings.ratioNumerator != null) {
    player.gameInstance.setRatio(player.resources.gameSettings.ratioNumerator / player.resources.gameSettings.ratioDenominator);
  }
  callback();
}
