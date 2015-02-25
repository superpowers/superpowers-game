exports.typescript = """
module Sup {
  export module Audio {
    export function getMasterVolume(volume) { return player.gameInstance.audio.masterGain.gain.value }
    export function setMasterVolume(volume) { player.gameInstance.audio.masterGain.gain.value = volume }

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
"""

exports.typescriptDefs = """
declare module Sup {
  module Audio {
    function getMasterVolume(): number;
    function setMasterVolume(volume: number): void;

    class SoundInstance {
      constructor(asset: Sound);
      play(): SoundInstance;
      stop(): SoundInstance;
      pause(): SoundInstance;

      getLoop(): boolean;
      setLoop(looping: boolean): SoundInstance;
      getVolume(): number;
      setVolume(volume: number): SoundInstance;
      getPan(): number;
      setPan(pan: number): SoundInstance;
      getPitch(): number;
      setPitch(pitch: number): SoundInstance;
    }
  }
}
"""

