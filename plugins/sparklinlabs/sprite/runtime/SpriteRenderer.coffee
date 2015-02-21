SpriteRenderer = require '../components/SpriteRenderer'

exports.typescript = """
module Sup {
  export class SpriteRenderer extends Sup.ActorComponent {
    __inner: any
    constructor(actor, asset) {
      super(actor);
      this.__inner = new SupEngine.componentPlugins.SpriteRenderer(this.actor.__inner, asset);
      this.__inner.__outer = this;
    }
  }
}
"""

exports.typescriptDefs = """
declare module Sup {
  class SpriteRenderer extends ActorComponent {
    constructor(actor: Actor, asset?: Asset)
  }
}
"""

exports.script =
  """
  namespace Sup
    blueprint SpriteRenderer extends ActorComponent
      transcendental construct(Actor actor, blackbox spriteAsset)
      transcendental action setSprite(blackbox spriteAsset)
      transcendental action getSprite(): blackbox

      transcendental action setOpacity(number opacity)
      transcendental action setColor(number r, number g, number b)

      transcendental action setAnimation(string animationName, boolean looping)
      transcendental action getAnimation() : string

      transcendental action setAnimationTime(number time)
      transcendental action getAnimationTime() : number
      transcendental action getAnimationDuration() : number

      transcendental action isAnimationPlaying(): boolean
      transcendental action playAnimation(boolean looping)
      transcendental action pauseAnimation()
      transcendental action stopAnimation()
  """

exports.js = (player) ->
  'Sup':
    'SpriteRenderer':
      'construct': (actor, asset) ->
        @__inner = new SpriteRenderer @actor.__inner, asset
        @actor.spriteRenderer = @
        @__inner.__outer = @
        return

      'prototype':
        'setSprite': (asset) -> @__inner.setSprite asset; return

        'setOpacity': (opacity) -> @__inner.opacity = @__inner.threeMesh.material.opacity = opacity; return
        'setColor': (r, g, b) ->
          @__inner.color.r = r
          @__inner.color.g = g
          @__inner.color.b = b
          @__inner.threeMesh.material.color.setRGB r, g, b
          return

        'setAnimation': (animationName, looping) -> @__inner.setAnimation animationName, looping; return
        'getAnimation': -> @__inner.getAnimation()

        'setAnimationTime': (time) -> @__inner.setAnimationTime time; return
        'getAnimationTime': -> @__inner.getAnimationTime()
        'getAnimationDuration': -> @__inner.getAnimationDuration()

        'isAnimationPlaying': -> @__inner.isAnimationPlaying
        'playAnimation': (looping=true) -> @__inner.playAnimation(looping); return
        'pauseAnimation': -> @__inner.pauseAnimation(); return
        'stopAnimation': -> @__inner.stopAnimation(); return

exports.setupComponent = (player, component, config) ->
  if config.spriteAssetId?
    sprite = player.getOuterAsset config.spriteAssetId
    component.setSprite sprite

    if config.animationId?
      # FIXME: should we load sprite with SupAPI?
      for animation in sprite.animations
        if animation.id == config.animationId
          component.setAnimation animation.name
          break

  return
