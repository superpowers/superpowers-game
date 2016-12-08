import * as async from "async";

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  player.getAssetData(`assets/${entry.storagePath}/model.json`, "json", (err: Error, data: any) => {

    const attributesList = data.attributes as string[];
    data.attributes = {};
    async.each(attributesList, (key, cb) => {
      player.getAssetData(`assets/${entry.storagePath}/attr-${key}.dat`, "arraybuffer", (err: Error, buffer: ArrayBuffer) => {
        data.attributes[key] = buffer;
        cb();
      });
    }, () => {
      const mapsList = data.maps as string[];
      data.textures = {};
      async.each(mapsList, (key, cb) => {
        const image = new Image();

        image.onload = () => {
          const texture = data.textures[key] = new SupEngine.THREE.Texture(image);
          texture.needsUpdate = true;

          if (data.filtering === "pixelated") {
            texture.magFilter = SupEngine.THREE.NearestFilter;
            texture.minFilter = SupEngine.THREE.NearestFilter;
          }

          if (data.wrapping === "repeat") {
            texture.wrapS = SupEngine.THREE.RepeatWrapping;
            texture.wrapT = SupEngine.THREE.RepeatWrapping;
          } else if (data.wrapping === "mirroredRepeat") {
            texture.wrapS = SupEngine.THREE.MirroredRepeatWrapping;
            texture.wrapT = SupEngine.THREE.MirroredRepeatWrapping;
          }

          cb();
        };

        image.onerror = () => { cb(); };
        image.src = `${player.dataURL}assets/${entry.storagePath}/map-${key}.dat`;
      }, () => { callback(null, data); });
    });
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Model(asset); }
