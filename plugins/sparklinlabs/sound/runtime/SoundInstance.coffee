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
        this.__inner = new SupEngine.SoundInstance(audioCtx, audioMasterGain, asset.buffer);
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
      constructor(asset: Asset);
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

exports.script =
  """
  namespace Audio
    transcendental machine setMasterVolume(number volume)
    transcendental machine getMasterVolume(): number

    blueprint SoundInstance
      transcendental construct(blackbox soundAsset)
      transcendental action play
      transcendental action stop
      transcendental action setLoop(boolean looping)
  """

exports.js = (player) ->
  'Audio':
    'setMasterVolume': (volume) -> player.gameInstance.audio.masterGain.gain.value = volume
    'getMasterVolume': -> player.gameInstance.audio.masterGain.gain.value

    'SoundInstance':
      'construct': (asset) ->
        audioCtx = player.gameInstance.audio.getContext()
        audioMasterGain = player.gameInstance.audio.masterGain
        @__inner = new SupEngine.SoundInstance audioCtx, audioMasterGain, asset.buffer
        return

      'prototype':
        'play': -> @__inner.play(); return
        'stop': -> @__inner.stop(); return
        'pause': -> @__inner.pause(); return

        # TODO: getState?

        'setLoop': (looping) -> @__inner.setLoop looping; return
        'setVolume': (volume) -> @__inner.setVolume volume; return
        'setPan': (pan) -> @__inner.setPan pan; return
        'setPitch': (pitch) -> @__inner.setPitch pitch; return

        'getLoop': -> @__inner.isLooping
        'getVolume': -> @__inner.volume
        'getPan': -> @__inner.pan
        'getPitch': -> @__inner.pitch
