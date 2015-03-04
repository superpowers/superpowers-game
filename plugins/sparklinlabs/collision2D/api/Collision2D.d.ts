declare module Sup {
  module Collision2D {
    function getAllBodies(): Array<Body>;
    function setGravity( gravity: Sup.Math.Vector3 );
    function intersects( body1: Body, body2: Body ): boolean;
    function collides( body1: Body, body2: Body ): boolean;
    function collides( body1: Body, body2: Array<Body> ): boolean;
  }
}