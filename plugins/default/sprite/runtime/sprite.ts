import * as async from "async";

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  player.getAssetData(`assets/${entry.storagePath}/sprite.json`, "json", (err, data) => {
    data.textures = {};

    let mapsList = data.maps;
      data.textures = {};
      async.each<string>(mapsList, (key, cb) => {
        let image = new Image();

        image.onload = () => {
          let texture = data.textures[key] = new SupEngine.THREE.Texture(image);

          // Three.js might resize our texture to make its dimensions power-of-twos
          // because of WebGL limitations (see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL#Non_power-of-two_textures)
          // so we store its original, non-power-of-two size for later use
          (<any>texture).size = { width: image.width, height: image.height };

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
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Sprite(asset); }
