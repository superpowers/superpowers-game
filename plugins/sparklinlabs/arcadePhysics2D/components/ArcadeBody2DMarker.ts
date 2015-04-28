import ArcadeBody2D from "./ArcadeBody2D";
let THREE = SupEngine.THREE;

import ArcadeBody2DUpdater from "./ArcadeBody2DUpdater";

export default class ArcadeBody2DMarker extends SupEngine.ActorComponent {
  static Updater = ArcadeBody2DUpdater;

  offset = new THREE.Vector3(0, 0, 0);
  line: THREE.Line;

  constructor(actor: SupEngine.Actor) {
    super(actor, "ArcadeBody2DMarker");
  }

  setSize(width: number, height: number) {
    if (this.line != null) this._clearRenderer();

    let geometry = new THREE.Geometry();
    geometry.vertices.push(new THREE.Vector3(-width / 2, -height / 2, 0.01));
    geometry.vertices.push(new THREE.Vector3( width / 2, -height / 2, 0.01));
    geometry.vertices.push(new THREE.Vector3( width / 2,  height / 2, 0.01));
    geometry.vertices.push(new THREE.Vector3(-width / 2,  height / 2, 0.01));
    geometry.vertices.push(new THREE.Vector3(-width / 2, -height / 2, 0.01));

    let material = new THREE.LineBasicMaterial({color: 0xf459e4});

    this.line = new THREE.Line(geometry, material);
    this.line.position.copy(this.offset);
    this.actor.threeObject.add(this.line);
    this.line.updateMatrixWorld(false);
  }

  setOffset(x: number, y: number) {
    this.offset.set(x, y, 0);
    this.line.position.copy(this.offset);
    this.line.updateMatrixWorld(false);
  }

  _clearRenderer() {
    this.actor.threeObject.remove(this.line);
    this.line.geometry.dispose();
    this.line.material.dispose();
    this.line = null;
  }
}
