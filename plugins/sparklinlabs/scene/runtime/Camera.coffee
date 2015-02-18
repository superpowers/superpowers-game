exports.setupComponent = (player, component, config) ->
  component.setOrthographicMode config.mode == 'orthographic'
  component.setFOV config.fov
  component.setOrthographicScale config.orthographicScale
  component.setViewportPosition config.viewport.x, config.viewport.y
  component.setViewportSize config.viewport.width, config.viewport.height
  return
