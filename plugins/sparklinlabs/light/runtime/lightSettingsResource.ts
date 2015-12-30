export function loadResource(player: SupRuntime.Player, resourceName: string, callback: (err: Error, data?: any) => any) {
  player.getAssetData(`resources/${resourceName}/resource.json`, `json`, (err, data) => {
    if (err != null) { callback(err); return; }
    callback(null, data);
  });
}
