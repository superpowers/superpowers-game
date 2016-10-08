const epsilon = 0.0001;
const THREE = SupEngine.THREE;
import ArcadeBody2D from "./ArcadeBody2D";
import ArcadeBody2DMarker from "./ArcadeBody2DMarker";

namespace ArcadePhysics2D {
  "use strict";

  export const allBodies: ArcadeBody2D[] = [];
  export const gravity = new THREE.Vector3(0, 0, 0);

  export function intersects(body1: ArcadeBody2D, body2: ArcadeBody2D) {
    if (body2.type === "tileMap") return checkTileMap(body1, body2, { moveBody: false });

    if (body1.right() < body2.left()) return false;
    if (body1.left() > body2.right()) return false;
    if (body1.bottom() > body2.top()) return false;
    if (body1.top() < body2.bottom()) return false;
    return true;
  }

  function detachFromBox(body1: ArcadeBody2D, body2: ArcadeBody2D) {
    let insideX = body1.position.x - body2.position.x;
    if (insideX >= 0) insideX -= (body1.width + body2.width) / 2;
    else insideX += (body1.width + body2.width) / 2;

    let insideY = body1.position.y - body2.position.y;
    if (insideY >= 0) insideY -= (body1.height + body2.height) / 2;
    else insideY += (body1.height + body2.height) / 2;

    if (Math.abs(insideY) <= Math.abs(insideX)) {
      if (body1.deltaY() / insideY > 0) {
        body1.velocity.y = -body1.velocity.y * body1.bounceY;
        body1.position.y -= insideY;
      }

      if (body1.position.y > body2.position.y) body1.touches.bottom = true;
      else body1.touches.top = true;
    } else {
      if (body1.deltaX() / insideX > 0) {
        body1.velocity.x = -body1.velocity.x * body1.bounceX;
        body1.position.x -= insideX;
      }

      if (body1.position.x > body2.position.x) body1.touches.left = true;
      else body1.touches.right = true;
    }
  }

  function checkTileMap(body1: ArcadeBody2D, body2: ArcadeBody2D, options: { moveBody: boolean; }) {
    function checkX() {
      const x = (body1.deltaX() < 0) ?
        Math.floor((body1.position.x - body2.position.x - body1.width / 2) / body2.mapToSceneFactor.x) :
        Math.floor((body1.position.x - body2.position.x + body1.width / 2 - epsilon) / body2.mapToSceneFactor.x);
      const y = body1.position.y - body2.position.y - body1.height / 2 + epsilon;
      const testedHeight = body1.height - 3 * epsilon;
      const totalPoints = Math.ceil(testedHeight / body2.mapToSceneFactor.y);
      for (let point = 0; point <= totalPoints; point++) {
        for (const layer of body2.layersIndex) {
          const tile = body2.tileMapAsset.getTileAt(layer, x, Math.floor((y + point * testedHeight / totalPoints) / body2.mapToSceneFactor.y));

          let collide = false;
          if (body2.tileSetPropertyName != null) collide = body2.tileSetAsset.getTileProperties(tile)[body2.tileSetPropertyName] != null;
          else if (tile !== -1) collide = true;
          if (!collide) continue;

          body1.velocity.x = -body1.velocity.x * body1.bounceX;
          if (body1.deltaX() < 0) {
            if (options.moveBody) body1.position.x = (x + 1) * body2.mapToSceneFactor.x + body2.position.x + body1.width / 2;
            body1.touches.left = true;
          } else {
            if (options.moveBody) body1.position.x = (x) * body2.mapToSceneFactor.x + body2.position.x - body1.width / 2;
            body1.touches.right = true;
          }
          return true;
        }
      }
      return false;
    }

    function checkY() {
      const x = body1.position.x - body2.position.x - body1.width / 2 + epsilon;
      const y = (body1.deltaY() < 0) ?
        Math.floor((body1.position.y - body2.position.y - body1.height / 2) / body2.mapToSceneFactor.y) :
        Math.floor((body1.position.y - body2.position.y + body1.height / 2 - epsilon) / body2.mapToSceneFactor.y);
      const testedWidth = body1.width - 3 * epsilon;
      const totalPoints = Math.ceil(testedWidth / body2.mapToSceneFactor.x);
      for (let point = 0; point <= totalPoints; point++) {
        for (const layer of body2.layersIndex) {
          const tile = body2.tileMapAsset.getTileAt(layer, Math.floor((x + point * testedWidth / totalPoints) / body2.mapToSceneFactor.x), y);

          let collide = false;
          if (body2.tileSetPropertyName != null) collide = body2.tileSetAsset.getTileProperties(tile)[body2.tileSetPropertyName] != null;
          else if (tile !== -1) collide = true;
          if (!collide) continue;

          body1.velocity.y = -body1.velocity.y * body1.bounceY;
          if (body1.deltaY() < 0) {
            if (options.moveBody) body1.position.y = (y + 1) * body2.mapToSceneFactor.y + body2.position.y + body1.height / 2;
            body1.touches.bottom = true;
          } else {
            if (options.moveBody) body1.position.y = (y) * body2.mapToSceneFactor.y + body2.position.y - body1.height / 2;
            body1.touches.top = true;
          }
          return true;
        }
      }
      return false;
    }

    const x = body1.position.x;
    body1.position.x = body1.previousPosition.x;

    let gotCollision = false;
    if (checkY()) gotCollision = true;
    body1.position.x = x;
    if (checkX()) gotCollision = true;

    return gotCollision;
  }

  export function collides(body1: ArcadeBody2D, bodies: ArcadeBody2D[]) {
    if (body1.type === "tileMap" || !body1.movable) throw new Error("The first body must be a movable box in ArcadePhysics2D.collides");

    body1.touches.top = false;
    body1.touches.bottom = false;
    body1.touches.right = false;
    body1.touches.left = false;

    if (!body1.enabled) return false;

    let gotCollision = false;
    for (const body2 of bodies) {
      if (body2 === body1 || !body2.enabled) continue;

      if (body2.type === "box") {
        if (intersects(body1, body2)) {
          gotCollision = true;
          detachFromBox(body1, body2);
        }

      } else if (body2.type === "tileMap") {
        if (checkTileMap(body1, body2, { moveBody: true })) gotCollision = true;
      }
    }

    if (gotCollision) body1.refreshActorPosition();
    return gotCollision;
  }
}
(<any>SupEngine).ArcadePhysics2D = ArcadePhysics2D;

SupEngine.registerEarlyUpdateFunction("ArcadePhysics2D", () => {
  for (const body of ArcadePhysics2D.allBodies) body.earlyUpdate();
});

SupEngine.registerComponentClass("ArcadeBody2D", ArcadeBody2D);
SupEngine.registerEditorComponentClass("ArcadeBody2DMarker", ArcadeBody2DMarker);
