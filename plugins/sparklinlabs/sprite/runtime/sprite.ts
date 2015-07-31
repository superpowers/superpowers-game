export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  player.getAssetData(`assets/${entry.id}/asset.json`, "json", (err, data) => {
    data.textures = {};

    let img = new Image();

    img.onload = () => {
      data.textures["map"] = new SupEngine.THREE.Texture(img);
      data.textures["map"].needsUpdate = true;

      if (data.filtering === "pixelated") {
        data.textures["map"].magFilter = SupEngine.THREE.NearestFilter;
        data.textures["map"].minFilter = SupEngine.THREE.NearestFilter;
      }

      callback(null, data);
    };

    img.onerror = () => { callback(null, data); };

    img.src = `${player.dataURL}assets/${entry.id}/map-map.dat`;
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Sprite(asset); }
