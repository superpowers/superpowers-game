exports.loadAsset = (player, entry, callback) ->
  sound = { buffer: null }

  if ! player.gameInstance.audio.getContext()?
    setTimeout ( -> callback null, sound ), 0
    return

  player.getAssetData "assets/#{entry.id}/asset.json", 'json', (err, data) =>
    player.getAssetData "assets/#{entry.id}/sound.dat", 'arraybuffer', (err, soundData) =>
      if err? then callback err; return

      if data.streaming
        typedArray = new Uint8Array soundData
        blob = new Blob [ typedArray ], { type: 'audio/*' }
        sound.buffer = URL.createObjectURL blob
        setTimeout ( -> callback null, sound ), 0
      else
        onLoad = (buffer) -> sound.buffer = buffer; callback null, sound; return
        onError = (err) -> callback null, sound; return
        player.gameInstance.audio.getContext().decodeAudioData soundData, onLoad, onError
      return
    return

exports.createOuterAsset = (player, asset) ->
  return new window.Sup.Sound asset
