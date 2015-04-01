module.exports = class CannonBodyMarkerUpdater
  constructor: (client, @bodyRenderer, @config) ->
    switch @config.shape
      when 'box' then @bodyRenderer.setBox { halfWidth: @config.halfWidth, halfHeight: @config.halfHeight, halfDepth: @config.halfDepth }
      when 'sphere' then @bodyRenderer.setSphere @config.radius
      when 'cylinder' then @bodyRenderer.setCylinder @config.radius, @config.height

    @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY, z: @config.offsetZ }

  config_setProperty: (path, value) ->
    @config[path] = value

    if path in ['halfWidth', 'halfHeight', 'halfDepth'] or (path == 'shape' and value == 'box')
      @bodyRenderer.setBox { halfWidth: @config.halfWidth, halfHeight: @config.halfHeight, halfDepth: @config.halfDepth }
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY, z: @config.offsetZ }

    if path in ['offsetX', 'offsetY', 'offsetZ']
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY, z: @config.offsetZ }

    if (path == 'radius' and @config.shape == 'cylinder') or (path == 'shape' and value == 'cylinder') or path == 'height'
      @bodyRenderer.setCylinder @config.radius, @config.height
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY, z: @config.offsetZ }

    if (path == 'radius' and @config.shape == 'sphere') or (path == 'shape' and value == 'sphere')
      @bodyRenderer.setSphere @config.radius
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY, z: @config.offsetZ }
    return
