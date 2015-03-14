exports.setupComponent = (player, component, config) ->
  component.setOrthographicMode config.mode == 'orthographic'
  component.setFOV config.fov
  component.setOrthographicScale config.orthographicScale
  component.setViewport config.viewport.x, config.viewport.y, config.viewport.width, config.viewport.height
  return
