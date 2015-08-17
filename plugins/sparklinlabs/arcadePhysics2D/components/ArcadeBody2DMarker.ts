import ArcadeBody2D from "./ArcadeBody2D";
let THREE = SupEngine.THREE;

import ArcadeBody2DUpdater from "./ArcadeBody2DUpdater";

export default class ArcadeBody2DMarker extends SupEngine.ActorComponent {
  static Updater = ArcadeBody2DUpdater;

  markerActor: SupEngine.Actor;
  offset = new THREE.Vector3(0, 0, 0);
  line: THREE.Line;
  plane = "XY";

  constructor(actor: SupEngine.Actor) {
    super(actor, "ArcadeBody2DMarker");

    this.markerActor = new SupEngine.Actor(this.actor.gameInstance, `Marker`, null, { layer: -1 });
  }

  update() {
    super.update();
    this.markerActor.setGlobalPosition(this.actor.getGlobalPosition());
  }

  setBox(width: number, height: number) {
    if (this.line != null) this._clearRenderer();

    let geometry = new THREE.Geometry();
    if (this.plane === "XY") {
      geometry.vertices.push(
        new THREE.Vector3(-width / 2, -height / 2, 0.01),
        new THREE.Vector3( width / 2, -height / 2, 0.01),
        new THREE.Vector3( width / 2,  height / 2, 0.01),
        new THREE.Vector3(-width / 2,  height / 2, 0.01),
        new THREE.Vector3(-width / 2, -height / 2, 0.01)
      );
    } else if (this.plane === "XZ") {
      geometry.vertices.push(
        new THREE.Vector3(-width / 2, 0.01, -height / 2),
        new THREE.Vector3( width / 2, 0.01, -height / 2),
        new THREE.Vector3( width / 2, 0.01,  height / 2),
        new THREE.Vector3(-width / 2, 0.01,  height / 2),
        new THREE.Vector3(-width / 2, 0.01, -height / 2)
      );
    }

    let material = new THREE.LineBasicMaterial({color: 0xf459e4});

    this.line = new THREE.Line(geometry, material);
    this.markerActor.threeObject.add(this.line);
    this.setOffset();
  }

  setOffset(x?: number, y?: number) {
    if (x != null && y != null) this.offset.set(x, y, 0);
    if (this.plane === "XY") this.line.position.set(this.offset.x, this.offset.y, 0);
    else this.line.position.set(this.offset.x, 0, this.offset.y);
    this.line.updateMatrixWorld(false);
  }

  setTileMap() {
    if (this.line != null) this._clearRenderer();
    // TODO ?
  }

  _clearRenderer() {
    this.markerActor.threeObject.remove(this.line);
    this.line.geometry.dispose();
    this.line.material.dispose();
    this.line = null;
  }

  _destroy() {
    if (this.line != null) this._clearRenderer();
    this.actor.gameInstance.destroyActor(this.markerActor);
    this.markerActor = null;
    super._destroy();
  }
}
