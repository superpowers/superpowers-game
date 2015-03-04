module Sup {
  export module Collision2D {
    export class Body extends ActorComponent {
      constructor( actor, options ) {
        super( actor );
        this.__inner = new SupEngine.componentPlugins.Body2D( actor.__inner, options );
        this.__inner.__outer = this;
        SupEngine.Collision2D.allBodies.push( this );
        this.actor.body2D = this;
      }
      setMovable( movable ) {
        this.__inner.movable = movable;
        return this
      }
      getMovable() { return this.__inner.movable }

      setSize( width, height ) {
        this.__inner.width = width;
        this.__inner.height = height;
        return this
      }
      getSize() { return { width: this.__inner.width, height: this.__inner.height}}

      setVelocity( velocity ) {
        this.__inner.velocity.x = velocity.x;
        this.__inner.velocity.y = velocity.y;
        return this
      }
      getVelocity() { return new Sup.Math.Vector3( this.__inner.velocity.x, this.__inner.velocity.y, 0 ) }
      getTouches() { return this.__inner.touches }
    }
  }
}