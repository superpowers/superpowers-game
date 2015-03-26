module.exports = class CannonBodyMarkerUpdater
  constructor: (client, @bodyRenderer, @config) ->
    @bodyRenderer.setSize { halfWidth: @config.halfWidth, halfHeight: @config.halfHeight, halfDepth: @config.halfDepth }
    @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY, z: @config.offsetZ }

  onConfigEdited: (path, value) ->
    @config[path] = value

    if path in ['halfWidth', 'halfHeight', 'halfDepth']
      @bodyRenderer.setSize { halfWidth: @config.halfWidth, halfHeight: @config.halfHeight, halfDepth: @config.halfDepth }
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY, z: @config.offsetZ }

    if path in ['offsetX', 'offsetY', 'offsetZ']
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY, z: @config.offsetZ }
    return
