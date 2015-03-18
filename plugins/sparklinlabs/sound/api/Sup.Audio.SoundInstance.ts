module Sup {
  export module Audio {
    export class SoundInstance {
      __inner: any;
      constructor(asset) {
        var audioCtx = player.gameInstance.audio.getContext();
        var audioMasterGain = player.gameInstance.audio.masterGain;
        this.__inner = new SupEngine.SoundInstance(audioCtx, audioMasterGain, asset.__inner.buffer);
        return
      }
      play() { this.__inner.play(); return this }
      stop() { this.__inner.stop(); return this }
      pause() { this.__inner.pause(); return this }

      getLoop() { return this.__inner.isLooping }
      setLoop(looping) { this.__inner.setLoop(looping); return this }
      getVolume() { return this.__inner.volume }
      setVolume(volume) { this.__inner.setVolume(volume); return this }
      getPan() { return this.__inner.pan }
      setPan(pan) { this.__inner.setPan(pan); return this }
      getPitch() { return this.__inner.pitch }
      setPitch(pitch) { this.__inner.setPitch(pitch); return this }
    }
  }
}
