export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: string, asset?: any) => any) {
  player.getAssetData(`assets/${entry.id}/asset.json`, "json", (err, data) => {
    var img = new Image();

    img.onload = () => {
      data.texture = new SupEngine.THREE.Texture(img);
      data.texture.needsUpdate = true;

      if (data.filtering === "pixelated") {
        data.texture.magFilter = SupEngine.THREE.NearestFilter;
        data.texture.minFilter = SupEngine.THREE.NearestFilter;
      }

      callback(null, data);
    };

    img.onerror = () => { callback(null, data); };

    img.src = `${player.dataURL}assets/${entry.id}/image.dat`;
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Sprite(asset); }
