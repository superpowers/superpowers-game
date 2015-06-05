export function init(player: SupRuntime.Player, callback: Function) {
  player.gameInstance.framesPerSecond = player.resources.gameSettings.framesPerSecond;
  SupRuntime.Player.updateInterval = 1 / player.gameInstance.framesPerSecond * 1000;

  if (player.resources.gameSettings.ratioNumerator != null && player.resources.gameSettings.ratioDenominator != null) {
    player.gameInstance.setRatio(player.resources.gameSettings.ratioNumerator / player.resources.gameSettings.ratioDenominator);
  }
  
  player.gameInstance.layers = player.gameInstance.layers.concat(player.resources.gameSettings.customLayers);
  
  callback();
}

export function lateStart(player: SupRuntime.Player, callback: Function) {
  let scene = player.resources.gameSettings.startupScene;
  if (scene != null) {
    var entry = player.entriesByPath[scene];
    if (entry == null) { callback(new Error(`Startup scene not found: ${scene}`)); return }

    var outerAsset = player.getOuterAsset(entry.id);
    if (outerAsset.type != 'scene') { callback(new Error(`Startup scene not found: ${scene}`)); return }

    (<any>window).Sup.loadScene(scene);
  }
  callback();
}
