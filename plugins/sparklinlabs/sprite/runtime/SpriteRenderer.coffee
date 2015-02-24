exports.typescript = """
module Sup {
  export class SpriteRenderer extends Sup.ActorComponent {
    constructor(actor, asset) {
      super(actor);
      this.__inner = new SupEngine.componentPlugins.SpriteRenderer(this.actor.__inner);
      if (asset) { this.setSprite(asset); }
      this.__inner.__outer = this;
      this.actor.spriteRenderer = this;
    }

    getSprite() { return this.__inner }
    setSprite(asset) { this.__inner.setSprite(asset.__inner); return this }
    setOpacity(opacity) { this.__inner.opacity = opacity; this.__inner.threeMesh.material.opacity = opacity; return this }
    setColor(r, g, b) {
      this.__inner.color.r = r; this.__inner.color.g = g; this.__inner.color.b = b;
      this.__inner.threeMesh.material.color.setRGB(r, g, b);
      return this
    }

    setAnimation(animationName, looping) { this.__inner.setAnimation(animationName, looping); return this }
    getAnimation() { return this.__inner.getAnimation() }
    setAnimationTime(time) { this.__inner.setAnimationTime(time); return this }
    getAnimationTime() { return this.__inner.getAnimationTime() }
    getAnimationDuration() { return this.__inner.getAnimationDuration() }

    isAnimationPlaying() { return this.__inner.isAnimationPlaying }
    playAnimation(looping) { this.__inner.playAnimation(looping); return this }
    pauseAnimation() { this.__inner.pauseAnimation(); return this }
    stopAnimation() { this.__inner.stopAnimation(); return this }
  }
}
"""

exports.typescriptDefs = """
declare module Sup {
  class SpriteRenderer extends ActorComponent {
    constructor(actor: Actor, asset?: Sprite);

    getSprite(): Sprite;
    setSprite(asset?: Sprite): SpriteRenderer;
    setOpacity(opacity: number): SpriteRenderer;
    setColor(r: number, g: number, b: number): SpriteRenderer;

    getAnimation(): string;
    setAnimation(animationName: string, looping?: boolean): SpriteRenderer;
    setAnimationTime(time: number): SpriteRenderer;
    getAnimationTime(): number
    getAnimationDuration(): number

    isAnimationPlaying(): boolean
    playAnimation(looping?: boolean): SpriteRenderer;
    pauseAnimation(): SpriteRenderer;
    stopAnimation(): SpriteRenderer;
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

#SpriteRenderer = require '../components/SpriteRenderer'
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
    sprite = player.getOuterAsset(config.spriteAssetId).__inner
    component.setSprite sprite

    if config.animationId?
      # FIXME: should we load sprite with SupAPI?
      for animation in sprite.animations
        if animation.id == config.animationId
          component.setAnimation animation.name
          break

  return
