// FontFace is a very new feature (supported in Chrome only). Not available in lib.d.ts just yet
declare let FontFace: any;

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  player.getAssetData(`assets/${entry.storagePath}/asset.json`, "json", (err, data) => {
    if (data.isBitmap) {
      const img = new Image();

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
      img.src = `${player.dataURL}assets/${entry.storagePath}/bitmap.dat`;

    } else {
      data.name = `Font${entry.id}`;

      let font: any /* FontFace */;
      try {
        font = new FontFace(data.name, `url(${player.dataURL}assets/${fixedEncodeURIComponent(entry.storagePath)}/font.dat)`);
        (<any>document).fonts.add(font);
      } catch (e) { /* Ignore */ }

      if (font != null) font.load().then(() => { callback(null, data); }, () => { callback(null, data); });
      else callback(null, data);

    }
  });
}

function fixedEncodeURIComponent(str: string) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c) {
    return `%${c.charCodeAt(0).toString(16)}`;
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Font(asset); }
