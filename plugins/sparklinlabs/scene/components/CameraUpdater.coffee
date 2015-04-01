module.exports = class CameraUpdater

  constructor: (@client, @camera, @config) ->
    @camera.setConfig @config
    return

  config_setProperty: (path, value) ->
    @camera.setConfig @config
    return
