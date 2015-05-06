let epsilon = 0.01;
let THREE = SupEngine.THREE;
import ArcadeBody2D from "./ArcadeBody2D";
import ArcadeBody2DMarker from "./ArcadeBody2DMarker";

module ArcadePhysics2D {
  export let allBodies: ArcadeBody2D[] = [];
  export let gravity = new THREE.Vector3( 0, 0, 0 );

  export function intersects( body1: ArcadeBody2D, body2: ArcadeBody2D ) {
    if (body2.type === "tileMap") throw new Error("ArcadePhysics2D.intersects isn't supported for tileMap")

    if (body1.right() < body2.left()) return false;
    if (body1.bottom() > body2.top()) return false;
    if (body1.left() > body2.right()) return false;
    if (body1.top() < body2.bottom()) return false;
    return true;
  }

  export function collides( body1: ArcadeBody2D, bodies: ArcadeBody2D[] ) {
    if (body1.type === "tileMap" || ! body1.movable) throw new Error("The first body must be a movable box in ArcadePhysics2D.collides");

    body1.touches.top = false;
    body1.touches.bottom = false;
    body1.touches.right = false;
    body1.touches.left = false;

    let gotCollision = false;
    for (let otherBody of bodies) {
      if (otherBody === body1) continue;

      if (otherBody.type === "box") {
        if (intersects( body1, otherBody ) !== false) {
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
        }

      } else if (otherBody.type === "tileMap") {
        function checkY(map: any, layers: number[], tileSet: any, tileSetPropertyName: string, mapToSceneFactor: number) {
          if (body1.deltaY() < 0) {
            let x = body1.position.x - body1.width / 2;
            let y = Math.floor((body1.position.y - body1.height / 2) / mapToSceneFactor);
            let testedWidth = body1.width - epsilon;
            let totalPoints = Math.ceil(testedWidth / mapToSceneFactor) + 1;
            for (let point = 0; point <= totalPoints; point++) {
              for (let layer in layers) {
                let tile = map.getTileAt(layer, Math.floor((x + point * testedWidth / totalPoints) / mapToSceneFactor), y);
                let solidProperty = tileSet.getTileProperties(tile)[tileSetPropertyName]
                if (solidProperty != null) {
                  gotCollision = true;
                  body1.velocity.y = -body1.velocity.y * body1.bounceY;
                  body1.position.y = (y + 1) * mapToSceneFactor + body1.height / 2;
                  body1.touches.bottom = true;
                  return;
                }
              }
            }
          } else if (body1.deltaY() > 0) {
            let x = body1.position.x - body1.width / 2;
            let y = Math.floor((body1.position.y + body1.height / 2 - epsilon) / mapToSceneFactor);
            let testedWidth = body1.width - epsilon;
            let totalPoints = Math.ceil(testedWidth / mapToSceneFactor) + 1;
            for (let point = 0; point <= totalPoints; point++) {
              for (let layer in layers) {
                let tile = map.getTileAt(layer, Math.floor((x + point * testedWidth / totalPoints) / mapToSceneFactor), y);
                let solidProperty = tileSet.getTileProperties(tile)[tileSetPropertyName]
                if (solidProperty != null) {
                  gotCollision = true;
                  body1.velocity.y = -body1.velocity.y * body1.bounceY;
                  body1.position.y = y * mapToSceneFactor - body1.height / 2;
                  body1.touches.bottom = true;
                  return;
                }
              }
            }
          }
        }

        function checkX(map: any, layers: number[], tileSet: any, tileSetPropertyName: string, mapToSceneFactor: number) {
          if (body1.deltaX() < 0) {
            let x = Math.floor((body1.position.x - body1.width / 2) / mapToSceneFactor);
            let y = body1.position.y - body1.height / 2;
            let testedHeight = body1.height - epsilon;
            let totalPoints = Math.ceil(testedHeight / mapToSceneFactor) + 1;
            for (let point = 0; point <= totalPoints; point++) {
              for (let layer in layers) {
                let tile = map.getTileAt(layer, x, Math.floor((y + point * testedHeight / totalPoints) / mapToSceneFactor));
                let solidProperty = tileSet.getTileProperties(tile)[tileSetPropertyName]
                if (solidProperty != null) {
                  gotCollision = true;
                  body1.velocity.x = -body1.velocity.x * body1.bounceX;
                  body1.position.x = (x + 1) * mapToSceneFactor + body1.width / 2;
                  body1.touches.left = true;
                  return true;
                }
              }
            }

          } else if (body1.deltaX() > 0) {
            let x = Math.floor((body1.position.x + body1.width / 2 - epsilon) / mapToSceneFactor);
            let y = body1.position.y - body1.height / 2;
            let testedHeight = body1.height - epsilon;
            let totalPoints = Math.ceil(testedHeight / mapToSceneFactor) + 1;
            for (let point = 0; point <= totalPoints; point++) {
              for (let layer in layers) {
                let tile = map.getTileAt(layer, x, Math.floor((y + point * testedHeight / totalPoints) / mapToSceneFactor));
                let solidProperty = tileSet.getTileProperties(tile)[tileSetPropertyName]
                if (solidProperty != null) {
                  gotCollision = true;
                  body1.velocity.x = -body1.velocity.x * body1.bounceX;
                  body1.position.x = x * mapToSceneFactor - body1.width / 2;
                  body1.touches.left = true;
                  return true;
                }
              }
            }
          }
          return false;
        }

        let yPosition = body1.position.y;
        let ySpeed = body1.velocity.y;

        checkY(otherBody.tileMapAsset, otherBody.layersIndex, otherBody.tileSetAsset, otherBody.tileSetPropertyName, otherBody.mapToSceneFactor);
        if (checkX(otherBody.tileMapAsset, otherBody.layersIndex, otherBody.tileSetAsset, otherBody.tileSetPropertyName, otherBody.mapToSceneFactor)) {
          body1.position.y = yPosition;
          body1.velocity.y = ySpeed;
          checkY(otherBody.tileMapAsset, otherBody.layersIndex, otherBody.tileSetAsset, otherBody.tileSetPropertyName, otherBody.mapToSceneFactor);
        }
      }
    }
    if (gotCollision) body1.refreshActorPosition();
    return gotCollision;
  }
}
(<any>SupEngine).ArcadePhysics2D = ArcadePhysics2D;

SupEngine.registerEarlyUpdateFunction("ArcadePhysics2D", () => {
  for (let body of ArcadePhysics2D.allBodies) body.earlyUpdate();
});

SupEngine.registerComponentClass("ArcadeBody2D", ArcadeBody2D);
SupEngine.registerEditorComponentClass("ArcadeBody2DMarker", ArcadeBody2DMarker);
