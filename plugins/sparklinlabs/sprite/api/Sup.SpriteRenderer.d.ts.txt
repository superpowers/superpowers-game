declare module Sup {
  class SpriteRenderer extends ActorComponent {
    constructor(actor: Actor, asset?: Sprite);

    getSprite(): Sprite;
    setSprite(asset?: Sprite): SpriteRenderer;
    getOpacity(): number;
    setOpacity(opacity: number): SpriteRenderer;
    getColor(): { r: number; g: number; b: number };
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
