exports.setupComponent = (player, component, config) ->
  component.width = config.width
  component.height = config.height
  component.movable = config.movable
  return