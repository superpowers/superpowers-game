declare module Sup {
  class ModelRenderer extends ActorComponent {
    constructor(actor: Actor, asset?: Model);

    getModel(): Model;
    setModel(asset?: Model): ModelRenderer;
    setOpacity(opacity: number): ModelRenderer;
    setColor(r: number, g: number, b: number): ModelRenderer;

    getAnimation(): string;
    setAnimation(animationName: string, looping?: boolean): ModelRenderer;
    setAnimationTime(time: number): ModelRenderer;
    getAnimationTime(): number
    getAnimationDuration(): number

    isAnimationPlaying(): boolean
    playAnimation(looping?: boolean): ModelRenderer;
    pauseAnimation(): ModelRenderer;
    stopAnimation(): ModelRenderer;
  }
}
