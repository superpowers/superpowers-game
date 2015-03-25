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
      this.__inner = new SupEngine.componentClasses.Behavior(actor.__inner, funcs);
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
