module Sup {
  export module Cannon {
    export var World = SupEngine.CannonWorld;
    export function getWorldAutoUpdate() { return SupEngine.CannonWorld.autoUpdate; }
    export function setWorldAutoUpdate(autoUpdate) {
      SupEngine.CannonWorld.autoUpdate = autoUpdate
    }

    export class Body extends ActorComponent {
      body: any;

      constructor( actor, options ) {
        super( actor );
        this.__inner = new SupEngine.componentClasses.CannonBody( actor.__inner, options );
        this.__inner.__outer = this;
        this.body = this.__inner.body;
        this.actor.cannonBody = this;
      }
      destroy() {
        this.body = null;
        this.actor.cannonBody = null;
        super.destroy();
      }
    }
  }
}
