exports.typescript = """
declare var TWEEN;

module Sup {
  export class Tween extends ActorComponent {
    __inner: any;
    tween: any;
    timer: number;

    constructor(actor, object) {
      super(actor);
      this.tween = new TWEEN.Tween( object );

      var self = this
      this.tween.onComplete( function() {
        self.destroy();
      });
      this.timer = -1;

      var funcs = {};
      funcs["update"] = this.update.bind(this)
      this.__inner = new SupEngine.componentPlugins.Behavior(actor.__inner, funcs);
    }
    update() {
      if (this.timer == -1 ) { return }

      this.timer += 1 / SupEngine.GameInstance.framesPerSecond
      this.tween.update(this.timer * 1000);
    }

    to( object, duration ) {
      this.tween.to( object, duration )
      return this
    }
    easing( easing ) {
      this.tween.easing( easing )
      return this
    }
    yoyo( yoyo ) {
      this.tween.yoyo( yoyo );
      return this
    }
    repeat( times ) {
      this.tween.repeat( times );
      return this
    }
    onUpdate( update ) {
      this.tween.onUpdate( update )
      return this
    }
    onComplete( complete ) {
      var self = this
      this.tween.onComplete( function() {
        complete();
        self.destroy();
      });
      return this
    }
    start() {
      this.timer = 0;
      this.tween.start(this.timer);
      return this
    }
  }
}
"""

exports.typescriptDefs = """
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

declare module TWEEN {
  export var REVISION: string;
  export function getAll(): Tween[];
  export function removeAll(): void;
  export function add(tween:Tween): void;
  export function remove(tween:Tween): void;
  export function update(time?:number): boolean;

  export class Tween {
    constructor(object?:any);
    to(properties:any, duration:number): Tween;
    start(time?:number): Tween;
    stop(): Tween;
    delay(amount:number): Tween;
    easing(easing: (k: number) => number): Tween;
    interpolation(interpolation: (v:number[], k:number) => number): Tween;
    chain(...tweens:Tween[]): Tween;
    onStart(callback: (object?: any) => void): Tween;
    onUpdate(callback: (object?: any) => void): Tween;
    onComplete(callback: (object?: any) => void): Tween;
    update(time: number): boolean;
    repeat(times: number): Tween;
    yoyo(enable: boolean): Tween;
  }
  export var Easing: TweenEasing;
  export var Interpolation: TweenInterpolation;
}

interface TweenEasing {
  Linear: {
    None(k:number): number;
  };
  Quadratic: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Cubic: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Quartic: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Quintic: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Sinusoidal: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Exponential: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Circular: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Elastic: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Back: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
  Bounce: {
    In(k:number): number;
    Out(k:number): number;
    InOut(k:number): number;
  };
}

interface TweenInterpolation {
  Linear(v:number[], k:number): number;
  Bezier(v:number[], k:number): number;
  CatmullRom(v:number[], k:number): number;

  Utils: {
    Linear(p0:number, p1:number, t:number): number;
    Bernstein(n:number, i:number): number;
    Factorial(n): number;
  };
}
"""