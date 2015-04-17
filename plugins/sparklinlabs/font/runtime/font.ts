// FontFace is a very new feature (supported in Chrome only). Not available in lib.d.ts just yet
declare var FontFace: any;

export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: string, asset?: any) => any) {
  player.getAssetData(`assets/${entry.id}/asset.json`, "json", (err, data) => {
    var typedArray = new Uint8Array(data.font);
    var blob = new Blob([ typedArray ], { type: "font/*" });
    this.url = URL.createObjectURL(blob);

    data.name = `Font${entry.id}`;
    var font = new FontFace(data.name, `url(${player.dataURL}assets/${entry.id}/font.dat)`);
    (<any>document).fonts.add(font);

    font.load().then(() => { callback(null, data) });
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Font(asset); }
