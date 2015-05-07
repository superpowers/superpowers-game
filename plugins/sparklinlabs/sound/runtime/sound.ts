export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  var sound = { buffer: <AudioBuffer|string>null };

  if (player.gameInstance.audio.getContext() == null) {
    setTimeout( () => { callback(null, sound); }, 0);
    return;
  }

  player.getAssetData(`assets/${entry.id}/asset.json`, "json", (err, data) => {
    player.getAssetData(`assets/${entry.id}/sound.dat`, "arraybuffer", (err, soundData) => {
      if (err != null) { callback(err); return; }

      if (data.streaming) {
        var typedArray = new Uint8Array(soundData);
        var blob = new Blob([ typedArray ], { type: "audio/*" });
        sound.buffer = URL.createObjectURL(blob);
        setTimeout( () => { callback(null, sound); }, 0);
      }
      else {
        var onLoad = (buffer: AudioBuffer) => { sound.buffer = buffer; callback(null, sound); };
        var onError = () => { callback(null, sound); };
        player.gameInstance.audio.getContext().decodeAudioData(soundData, onLoad, onError);
      }
    });
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Sound(asset); }
