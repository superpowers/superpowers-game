export function loadResource(player: SupRuntime.Player, resourceName: string, callback: (err: Error, resource?: any) => any) {
  player.getAssetData(`resources/${resourceName}/resource.json`, "json", (err, data) => {
    if (err != null) { callback(err); return; }

    for (let behaviorName in data.behaviors) {
      let behavior = data.behaviors[behaviorName];
      behavior.propertiesByName = {};
      for (let property of behavior.properties) behavior.propertiesByName[property.name] = property;
    }

    callback(null, data);
  });
}
