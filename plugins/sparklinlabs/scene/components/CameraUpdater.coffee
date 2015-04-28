module.exports = class CameraUpdater

  constructor: (@client, @camera, @config) ->
    @camera.setConfig @config
    return

  destroy: ->

  config_setProperty: (path, value) ->
    @camera.setConfig @config
    return
