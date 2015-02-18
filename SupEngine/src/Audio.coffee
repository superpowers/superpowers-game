module.exports = class Audio

  constructor: ->
    @_ctx = null

  getContext: ->
    return null if ! window.AudioContext?

    return @_ctx if @_ctx?

    @_ctx = new AudioContext()
    @masterGain = @_ctx.createGain()
    @masterGain.gain.value = 1
    @masterGain.connect @_ctx.destination
    @_ctx
