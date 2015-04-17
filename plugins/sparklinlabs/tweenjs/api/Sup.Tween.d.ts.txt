declare module Sup {
  class Tween {
    constructor(actor: Sup.Actor, object: Object);

    to( object: Object, duration: number ): Tween;
    easing( easing ): Tween;
    yoyo( yoyo: boolean ): Tween;
    repeat( times: number ): Tween;
    onUpdate( onUpdate: Function ): Tween;
    onComplete( onComplete: Function ): Tween;
    start(): Tween;
  }
}
