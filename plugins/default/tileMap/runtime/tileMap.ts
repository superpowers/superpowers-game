import TileMap from "../components/TileMap";

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset: any) => any) {
  player.getAssetData(`assets/${entry.storagePath}/tilemap.json`, "json", (err, data) => {
    callback(null, new TileMap(data));
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) {
  return new (<any>window).Sup.TileMap(asset);
}
