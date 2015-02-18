module.exports = class SoundInstance
  @soundState =
      playing: 0
      paused: 1
      stopped: 2

  constructor: (@audioCtx, @audioMasterGain, @buffer) ->
    @offset = 0
    @isLooping = false
    @state = SoundInstance.soundState.stopped

    @volume = 1.0
    @pitch = 0.0
    @pan = 0.0
  
  destroy: ->
    @stop()
    @audioCtx = null
    @audioMasterGain = null
    return

  play: ->
    return if ! @audioCtx? or ! @buffer?
    return if @state == SoundInstance.soundState.playing
    @stop() if @source?

    # if @buffer instanceof HTMLAudioElement
    if typeof @buffer == 'string'
      audio = new Audio
      audio.src = @buffer
      @source = @audioCtx.createMediaElementSource audio
      if ! @source.mediaElement? then @source = null; return
      @source.mediaElement.loop = @isLooping
    else
      # Assuming AudioBuffer
      @source = @audioCtx.createBufferSource()
      @source.buffer = @buffer
      @source.loop = @isLooping

    @panner = @audioCtx.createPanner()
    @panner.setPosition -@pan, 0, 0

    if ! @source.gain?
      gainNode = @audioCtx.createGain()
      @source.gain = gainNode.gain
      @source.connect gainNode

      # NOTE: the panner node doesn't work in Firefox right now
      # so we by-pass it until then
      # gainNode.connect @panner
      gainNode.connect @audioMasterGain
    else
      @panner.connect @audioMasterGain
      @source.connect @panner

    @source.gain.value = @volume

    # NOTE: playbackRate is not supported on MediaElementSources
    @source.playbackRate?.value = Math.pow( 2, @pitch )

    @state = SoundInstance.soundState.playing
    @source.onended = => @state = SoundInstance.soundState.stopped

    @startTime = @audioCtx.currentTime - @offset

    if @source.mediaElement?
      @source.mediaElement.currentTime = @offset
      @source.mediaElement.play()
    else
      @source.start 0, @offset
    return

  stop: ->
    return if ! @audioCtx?

    if @source?
      if @source.mediaElement?
        @source.mediaElement.pause()
        @source.mediaElement.currentTime = 0
      else
        @source.stop 0
      @source.disconnect()
      delete @source
      
      @panner?.disconnect()
      delete @panner

    @offset = 0
    @state = SoundInstance.soundState.stopped
    return

  pause: ->
    return if ! @audioCtx?

    if @source?
      @offset = @audioCtx.currentTime - @startTime

      if @source.mediaElement?
        @source.mediaElement.pause()
      else
        @source.stop 0
      delete @source
      delete @panner

      @state = SoundInstance.soundState.paused
    
    return

  getState: ->
    # Workaround Webkit audio's lack of support for the onended callback
    if @state == SoundInstance.soundState.playing
      if @source.playbackState? and @source.playbackState == @source.FINISHED_STATE
        @state = SoundInstance.soundState.stopped
      else if @source.mediaElement?.paused
        @state = SoundInstance.soundState.stopped

    @state

  setLoop: (@isLooping) ->
    return if ! @source?

    if @source.mediaElement? then @source.mediaElement.loop = @isLooping
    else @source.loop = @isLooping
    return

  setVolume: (volume) ->
    @volume = Math.max( 0, Math.min( 1, volume ) )
    @source?.gain.value = @volume
    return

  setPan: (pan) ->
    @pan = Math.max( -1, Math.min( 1, pan ) )
    @panner.setPosition -@pan, 0, 0 if @source?
    return

  setPitch: (pitch) ->
    @pitch = Math.max( -1, Math.min( 1, pitch ) )
    # NOTE: playbackRate is not supported on MediaElementSources
    @source?.playbackRate?.value = Math.pow( 2, @pitch )
    return
