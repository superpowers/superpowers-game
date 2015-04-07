module Sup {
  export module Audio {
    export function getMasterVolume(volume) { return player.gameInstance.audio.masterGain.gain.value }
    export function setMasterVolume(volume) { player.gameInstance.audio.masterGain.gain.value = volume }
  }
}