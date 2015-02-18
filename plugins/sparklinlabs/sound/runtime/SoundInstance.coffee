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
