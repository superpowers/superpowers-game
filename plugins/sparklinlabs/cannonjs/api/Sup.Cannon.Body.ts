module Sup {
  export module Cannon {
    export var World = SupEngine.CannonWorld;

    export class Body extends ActorComponent {
      body: any;

      constructor( actor, options ) {
        super( actor );
        this.__inner = new SupEngine.componentClasses.CannonBody( actor.__inner, options );
        this.__inner.__outer = this;
        this.body = this.__inner.body;
        World.addBody(this.body);
        this.actor.cannonBody = this;
      }
      destroy() {
        World.remove(this.body);
        this.body = null;
        this.actor.cannonBody = null;
        super.destroy();
      }
    }
  }
}
