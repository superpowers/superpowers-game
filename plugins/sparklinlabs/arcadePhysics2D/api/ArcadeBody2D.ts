module Sup {
  export module ArcadePhysics2D {
    export class Body extends ActorComponent {
      constructor( actor, options ) {
        super( actor );
        this.__inner = new SupEngine.componentPlugins.ArcadeBody2D( actor.__inner, options );
        this.__inner.__outer = this;
        SupEngine.ArcadePhysics2D.allBodies.push( this );
        this.actor.arcadeBody2D = this;
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

      setVelocityMin( velocityMin ) {
        this.__inner.velocityMin.x = velocityMin.x;
        this.__inner.velocityMin.y = velocityMin.y;
        return this
      }
      getVelocityMin() { return new Sup.Math.Vector3( this.__inner.velocityMin.x, this.__inner.velocityMin.y, 0 ) }

      setVelocityMax( velocityMax ) {
        this.__inner.velocityMax.x = velocityMax.x;
        this.__inner.velocityMax.y = velocityMax.y;
        return this
      }
      getVelocityMax() { return new Sup.Math.Vector3( this.__inner.velocityMax.x, this.__inner.velocityMax.y, 0 ) }

      setVelocityMultiplier( velocityMultiplier ) {
        this.__inner.velocityMultiplier.x = velocityMultiplier.x;
        this.__inner.velocityMultiplier.y = velocityMultiplier.y;
        return this
      }
      getVelocityMultiplier() { return new Sup.Math.Vector3( this.__inner.velocityMultiplier.x, this.__inner.velocityMultiplier.y, 1 ) }

      setAngularVelocity( angularVelocity ) {
        this.__inner.angularVelocity = angularVelocity;
        return this
      }
      getAngularVelocity() { return this.__inner.angularVelocity }

      setAngularVelocityMultiplier( angularVelocityMultiplier ) {
        this.__inner.angularVelocityMultiplier = angularVelocityMultiplier
        return this
      }
      getAngularVelocityMultiplier() { return this.__inner.angularVelocityMultiplier }

      getTouches() { return this.__inner.touches }
    }
  }
}
