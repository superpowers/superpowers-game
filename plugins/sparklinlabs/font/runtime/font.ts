// FontFace is a very new feature (supported in Chrome only). Not available in lib.d.ts just yet
declare var FontFace: any;

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: string, asset?: any) => any) {
  player.getAssetData(`assets/${entry.id}/asset.json`, "json", (err, data) => {
    data.name = `Font${entry.id}`;

    try {
      var font = new FontFace(data.name, `url(${player.dataURL}assets/${entry.id}/font.dat)`);
      (<any>document).fonts.add(font);
    } catch(e) {}

    if (font != null) {
      font.load().then(() => { callback(null, data); });
    } else {
      callback(null, data);
    }
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Font(asset); }
