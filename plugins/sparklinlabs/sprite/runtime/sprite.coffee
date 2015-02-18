THREE = SupEngine.THREE

exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) =>
    img = new Image

    img.onload = ->
      data.texture = new THREE.Texture img
      data.texture.needsUpdate = true

      if data.filtering == 'pixelated'
        data.texture.magFilter = THREE.NearestFilter
        data.texture.minFilter = THREE.NearestFilter

      callback null, data; return

    img.onerror = -> callback null, data; return

    img.src = "#{player.dataURL}assets/#{entry.id}/image.dat"
    return
  return
