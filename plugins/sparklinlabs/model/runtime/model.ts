import * as async from "async";

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  player.getAssetData(`assets/${entry.id}-${entry.path}/model.json`, "json", (err: Error, data: any) => {

    let attributesList = data.attributes;
    data.attributes = {};
    async.each(attributesList, (key: string, cb: Function) => {
      player.getAssetData(`assets/${entry.id}-${entry.path}/attr-${key}.dat`, "arraybuffer", (err: Error, buffer: ArrayBuffer) => {
        data.attributes[key] = buffer;
        cb(); return
      });
    }, () => {
      let mapsList = data.maps;
      data.textures = {};
      async.each(mapsList, (key: string, cb: Function) => {
        let image = new Image();

        image.onload = () => {
          let texture = data.textures[key] = new SupEngine.THREE.Texture(image);
          texture.needsUpdate = true;

          texture.magFilter = SupEngine.THREE.NearestFilter;
          texture.minFilter = SupEngine.THREE.NearestFilter;
          cb();
        };

        image.onerror = () => { cb(); };
        image.src = `${player.dataURL}assets/${entry.id}-${entry.path}/map-${key}.dat`;
      }, () => { callback(null, data); });
    });
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Model(asset); }
