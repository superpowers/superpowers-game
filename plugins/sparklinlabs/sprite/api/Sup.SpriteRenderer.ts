module Sup {
  export class SpriteRenderer extends Sup.ActorComponent {
    constructor(actor, asset) {
      super(actor);
      this.__inner = new SupEngine.componentPlugins.SpriteRenderer(this.actor.__inner);
      if (asset) { this.setSprite(asset); }
      this.__inner.__outer = this;
      this.actor.spriteRenderer = this;
    }
    destroy() {
      this.actor.spriteRenderer = null;
      super.destroy();
    }

    getSprite() { return this.__inner.asset.__outer }
    setSprite(asset) { this.__inner.setSprite(asset.__inner); return this }
    getOpacity() { this.__inner.opacity; }
    setOpacity(opacity) { this.__inner.opacity = opacity; this.__inner.threeMesh.material.opacity = opacity; return this }
    getColor() { return { r: this.__inner.color.r, g: this.__inner.color.g, b: this.__inner.color.b }; }
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
