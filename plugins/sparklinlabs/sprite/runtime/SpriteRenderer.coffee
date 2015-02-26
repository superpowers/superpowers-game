exports.setupComponent = (player, component, config) ->
  if config.spriteAssetId?
    sprite = player.getOuterAsset(config.spriteAssetId).__inner
    component.setSprite sprite

    if config.animationId?
      # FIXME: should we load sprite with SupCore.data?
      for animation in sprite.animations
        if animation.id == config.animationId
          component.setAnimation animation.name
          break
  return

fs = require 'fs'
exports.typescript = fs.readFileSync(__dirname + '/SpriteRenderer.ts', encoding: 'utf8')
exports.typescriptDefs = fs.readFileSync(__dirname + '/SpriteRenderer.d.ts', encoding: 'utf8')
