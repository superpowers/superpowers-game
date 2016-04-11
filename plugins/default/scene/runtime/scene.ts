export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, data?: any) => any) {
  player.getAssetData(`assets/${entry.storagePath}/scene.json`, "json", callback);
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) {
  return new (<any>window).Sup.Scene(asset);
}
