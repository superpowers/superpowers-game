export function loadAsset(player: SupRuntime.Player, entry: any, callback: (err: Error, asset?: any) => any) {
  let sound = { buffer: <AudioBuffer|string>null };

  if (player.gameInstance.audio.getContext() == null) {
    setTimeout(() => { callback(null, sound); }, 0);
    return;
  }

  player.getAssetData(`assets/${entry.storagePath}/sound.json`, "json", (err, data) => {
    player.getAssetData(`assets/${entry.storagePath}/sound.dat`, "arraybuffer", (err, soundData) => {
      if (err != null) { callback(err); return; }

      if (data.streaming) {
        let typedArray = new Uint8Array(soundData);
        let blob = new Blob([ typedArray ], { type: "audio/*" });
        sound.buffer = URL.createObjectURL(blob);
        setTimeout(() => { callback(null, sound); }, 0);
      }
      else {
        let onLoad = (buffer: AudioBuffer) => { sound.buffer = buffer; callback(null, sound); };
        let onError = () => { callback(null, sound); };
        player.gameInstance.audio.getContext().decodeAudioData(soundData, onLoad, onError);
      }
    });
  });
}

export function createOuterAsset(player: SupRuntime.Player, asset: any) { return new (<any>window).Sup.Sound(asset); }
