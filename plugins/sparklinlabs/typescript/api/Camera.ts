module Sup {
  export class Camera extends ActorComponent {
    constructor(actor) {
      super(actor);
      this.__inner = new SupEngine.componentPlugins.Camera(this.actor.__inner);
      this.__inner.__outer = this;
      this.actor.camera = this;
    }
    destroy() {
      this.actor.camera = null;
      super.destroy();
    }

    setOrthographicMode(enabled) {
      this.__inner.setOrthographicMode(enabled);
      return this;
    }
    getOrthographicMode() { return this.__inner.isOrthographic }
    setOrthographicScale(scale) {
      this.__inner.setOrthographicScale(scale);
      return this
    }
    getOrthographicScale() {return this.__inner.orthographicScale }
  }
}
