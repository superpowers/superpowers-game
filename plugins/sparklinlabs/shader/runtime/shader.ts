export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  player.getAssetData(`assets/${entry.storagePath}/shader.json`, "json", (err, data) => {
    player.getAssetData(`assets/${entry.storagePath}/vertexShader.txt`, "text", (err, vertexShader) => {
      data.vertexShader.text = vertexShader;
      player.getAssetData(`assets/${entry.storagePath}/fragmentShader.txt`, "text", (err, fragmentShader) => {
        data.fragmentShader.text = fragmentShader;
        callback(null, data);
      });
    });
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Shader(asset); }