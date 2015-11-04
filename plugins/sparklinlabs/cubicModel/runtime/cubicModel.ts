import * as async from "async";

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  player.getAssetData(`assets/${entry.storagePath}/cubicModel.json`, "json", (err, data) => {
    data.textures = {};

    let mapsList = data.maps;
      data.textures = {};
      async.each<string>(mapsList, (key, cb) => {
        let canvas = document.createElement("canvas");
        canvas.width = data.textureWidth;
        canvas.height = data.textureHeight;
        let ctx = canvas.getContext("2d");
        let texture = data.textures[key] = new SupEngine.THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.magFilter = SupEngine.THREE.NearestFilter;
        texture.minFilter = SupEngine.THREE.NearestFilter;

        player.getAssetData(`assets/${entry.storagePath}/map-${key}.dat`, "arraybuffer", (err, map) => {
          let imageData = new ImageData(new Uint8ClampedArray(map), data.textureWidth, data.textureHeight)
          ctx.putImageData(imageData, 0, 0);
          cb();
        });
      }, () => { callback(null, data); });
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.CubicModel(asset); }
