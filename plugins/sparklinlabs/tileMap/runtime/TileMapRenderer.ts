export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  if (config.tileMapAssetId == null) return;

  let tileMap = player.getOuterAsset(config.tileMapAssetId);
  component.setTileMap(tileMap.__inner);

  let tileSetId = (config.tileSetAssetId != null) ? config.tileSetAssetId : tileMap.__inner.data.tileSetId;
  let tileSet = player.getOuterAsset(tileSetId);
  component.setTileSet(tileSet.__inner);
}
