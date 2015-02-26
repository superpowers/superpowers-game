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
