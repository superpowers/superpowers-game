let THREE = SupEngine.THREE;
import ArcadeBody2D from "./ArcadeBody2D";
import ArcadeBody2DMarker from "./ArcadeBody2DMarker";

module ArcadePhysics2D {
  export let allBodies: ArcadeBody2D[] = [];
  export let gravity = new THREE.Vector3( 0, -0.1, 0 );

  export function intersects( body1: ArcadeBody2D, body2: ArcadeBody2D ) {
    if (body1.right() < body2.left()) return false;
    if (body1.bottom() > body2.top()) return false;
    if (body1.left() > body2.right()) return false;
    if (body1.top() < body2.bottom()) return false;

    return true;
  }

  export function collides( body1: ArcadeBody2D, bodies: ArcadeBody2D[] ) {
    body1.touches.top = false;
    body1.touches.bottom = false;
    body1.touches.right = false;
    body1.touches.left = false;

    let gotCollision = false;
    for (let otherBody of bodies) {
      if (otherBody == body1) continue;

      if (intersects( body1, otherBody )) {
        gotCollision = true;

        let insideX = body1.position.x - otherBody.position.x;
        if (insideX >= 0) insideX -= ( body1.width + otherBody.width ) / 2;
        else insideX += ( body1.width + otherBody.width ) / 2;

        let insideY = body1.position.y - otherBody.position.y;
        if (insideY >= 0) insideY -= ( body1.height + otherBody.height ) / 2;
        else insideY += ( body1.height + otherBody.height ) / 2;

        if (Math.abs( insideY ) <= Math.abs( insideX )) {
          if (body1.deltaY() / insideY > 0) {
            body1.velocity.y = -body1.velocity.y * body1.bounceY;
            body1.position.y -= insideY;

            if (body1.position.y > otherBody.position.y) body1.touches.bottom = true;
            else body1.touches.top = true;
          }
        }
        else {
          if (body1.deltaX() / insideX > 0) {
            body1.velocity.x = -body1.velocity.x * body1.bounceX;
            body1.position.x -= insideX;

            if (body1.position.x > otherBody.position.x) body1.touches.left = true;
            else body1.touches.right = true;
          }
        }
        body1.refreshActorPosition();
      }
    }
    return gotCollision;
  }
}
(<any>SupEngine).ArcadePhysics2D = ArcadePhysics2D;

SupEngine.registerEarlyUpdateFunction("ArcadePhysics2D", () => {
  for (let body of ArcadePhysics2D.allBodies) body.earlyUpdate();
});

SupEngine.registerComponentClass("ArcadeBody2D", ArcadeBody2D);
SupEngine.registerEditorComponentClass("ArcadeBody2DMarker", ArcadeBody2DMarker);
