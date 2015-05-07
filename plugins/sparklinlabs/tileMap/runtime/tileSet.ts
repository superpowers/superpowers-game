import TileSet from "../components/TileSet";

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset: any) => any) {
  player.getAssetData("assets/#{entry.id}/asset.json", 'json', (err, data) => {
    let img = new Image();

    img.onload = () => {
      data.texture = new SupEngine.THREE.Texture(img);
      data.texture.needsUpdate = true;
      data.texture.magFilter = SupEngine.THREE.NearestFilter;
      data.texture.minFilter = SupEngine.THREE.NearestFilter;

      callback(null, new TileSet(data));
    }

    img.onerror = () => { callback(null, new TileSet(data)); }

    img.src = `#{player.dataURL}assets/${entry.id}/image.dat`
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) {
  return new (<any>window).Sup.TileSet(asset);
}
