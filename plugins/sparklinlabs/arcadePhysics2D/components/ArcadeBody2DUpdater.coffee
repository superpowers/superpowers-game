module.exports = class ArcadeBody2DUpdater
  constructor: (client, @bodyRenderer, @config) ->
    @bodyRenderer.setSize { width: @config.width, height: @config.height }
    @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY }

  onConfigEdited: (path, value) ->
    @config[path] = value

    if path in ['width', 'height'] then @bodyRenderer.setSize { width: @config.width, height: @config.height }
    if path in ['offsetX', 'offsetY'] then @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY }
    return
