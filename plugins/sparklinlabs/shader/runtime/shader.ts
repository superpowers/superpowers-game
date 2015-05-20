export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  player.getAssetData(`assets/${entry.id}/asset.json`, "json", callback);
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Shader(asset); }