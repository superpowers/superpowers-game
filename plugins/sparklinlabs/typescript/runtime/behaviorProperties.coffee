exports.loadResource = (player, resourceName, callback) ->
  player.getAssetData "resources/#{resourceName}/resource.json", 'json', (err, data) =>
    if err? then callback err; return

    for behaviorName, behavior of data.behaviors
      behavior.propertiesByName = {}
      behavior.propertiesByName[property.name] = property for property in behavior.properties

    callback null, data; return
