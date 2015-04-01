module.exports = class P2BodyMarkerUpdater
  constructor: (client, @bodyRenderer, @config) ->
    switch @config.shape
      when 'rectangle' then @bodyRenderer.setRectangle @config.width, @config.height
      when 'circle' then @bodyRenderer.setCircle @config.radius

    @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY }

  config_setProperty: (path, value) ->
    @config[path] = value

    if path in ['width', 'height'] or (path == 'shape' and value == 'rectangle')
      @bodyRenderer.setRectangle @config.width, @config.height
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY }

    if path == 'radius' or (path == 'shape' and value == 'circle')
      @bodyRenderer.setCircle @config.radius
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY }

    if path in ['offsetX', 'offsetY']
      @bodyRenderer.setOffset { x: @config.offsetX, y: @config.offsetY }
    return
