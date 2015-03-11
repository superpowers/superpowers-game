async = require 'async'

exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) =>

    attributesList = data.attributes
    data.attributes = {}
    async.each attributesList, (key, cb) ->
      player.getAssetData "assets/#{entry.id}/attr-#{key}.dat", 'arraybuffer', (err, buffer) ->
        data.attributes[key] = buffer
        cb(); return
      return
    , ->
      mapsList = data.maps
      data.textures = {}
      async.each mapsList, (key, cb) ->
        image = new Image()

        image.onload = ->
          texture = data.textures[key] = new SupEngine.THREE.Texture image
          texture.needsUpdate = true
          cb(); return

        image.onerror = cb
        image.src = "#{player.dataURL}assets/#{entry.id}/map-#{key}.dat"
        return
      , ->
        callback null, data
        return
      return
    return
  return

exports.createOuterAsset = (player, asset) ->
  return new window.Sup.Model asset
