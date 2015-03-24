module.exports = class ArcadeBody2DUpdater
  constructor: (client, @bodyRenderer, @config) ->
    @bodyRenderer.setConfig @config

  onConfigEdited: (path, value) ->
    @config[path] = value
    @bodyRenderer.setConfig @config
    return
