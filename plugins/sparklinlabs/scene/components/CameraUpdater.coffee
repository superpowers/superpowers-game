module.exports = class CameraUpdater

  constructor: (@client, @camera, @config) ->
    @camera.setConfig @config
    return

  onConfigEdited: (path, value) ->
    @camera.setConfig @config
    return
