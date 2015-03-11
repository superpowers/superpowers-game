exports.setupComponent = (player, component, config) ->
  if config.modelAssetId?
    model = player.getOuterAsset(config.modelAssetId).__inner
    component.setModel model

    if config.animationId?
      # FIXME: should we load model with SupAPI?
      for animation in model.animations
        if animation.id == config.animationId
          component.setAnimation animation.name
          break
  return
