export function setupComponent(player: SupRuntime.Player, component: any, config: any) {
  if (config.tileMapAssetId == null) return;

  const tileMap = player.getOuterAsset(config.tileMapAssetId);
  let shader: any;
  if (config.materialType === "shader") {
    if (config.shaderAssetId != null) {
      const shaderAsset = player.getOuterAsset(config.shaderAssetId);
      if (shaderAsset == null) return;
      shader = shaderAsset.__inner;
    }
  }
  component.castShadow = config.castShadow;
  component.receiveShadow = config.receiveShadow;
  component.setTileMap(tileMap.__inner, config.materialType, shader);

  const tileSetId = (config.tileSetAssetId != null) ? config.tileSetAssetId : tileMap.__inner.data.tileSetId;
  const tileSet = player.getOuterAsset(tileSetId);
  component.setTileSet(tileSet.__inner);
}
