export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  if (config.type === "box") component.setupBox(config);

  else if (config.type === "tileMap") {
    config.tileMapAsset = player.getOuterAsset(config.tileMapAssetId);
    config.tileSetAsset = player.getOuterAsset(config.tileMapAsset.__inner.data.tileSetId);
    component.setupTileMap(config);
  }
}
