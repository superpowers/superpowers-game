exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) =>
    img = new Image

    img.onload = ->
      data.texture = new SupEngine.THREE.Texture img
      data.texture.needsUpdate = true

      if data.filtering == 'pixelated'
        data.texture.magFilter = SupEngine.THREE.NearestFilter
        data.texture.minFilter = SupEngine.THREE.NearestFilter

      callback null, data; return

    img.onerror = -> callback null, data; return

    img.src = "#{player.dataURL}assets/#{entry.id}/image.dat"
    return
  return

exports.createOuterAsset = (player, asset) ->
  return new window.Sup.Sprite asset
