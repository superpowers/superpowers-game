declare module Sup {
  module Collision2D {
    class Body {
      constructor( actor: Sup.Actor, options?: {movable?: boolean; width?: number; height?: number; bounceX?: number; bounceY?: number} );
      setMovable( movable: boolean ): Body;
      getMovable(): boolean;
      setSize( width: number, height: number ): Body;
      getSize(): { width: number; height: number; };
      setVelocity( velocity: Sup.Math.Vector3 ): Body;
      getVelocity(): Sup.Math.Vector3;
      getTouches(): { top: boolean; bottom: boolean; right: boolean; left: boolean };
    }
  }
}