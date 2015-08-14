export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  if (config.type === "box") component.setupBox(config);

  else if (config.type === "tileMap") {
    config.tileMapAsset = player.getOuterAsset(config.tileMapAssetId);
    config.tileSetAsset = player.getOuterAsset(config.tileMapAsset.__inner.data.tileSetId);
    component.setupTileMap(config);
  }
}

export function init(player: any, callback: Function) {
  (<any>SupEngine).ArcadePhysics2D.plane = player.resources.arcadePhysics2DSettings.plane;
  callback();
}
