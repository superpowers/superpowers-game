let THREE = SupEngine.THREE;
import P2BodyMarkerUpdater from "./P2BodyMarkerUpdater";

export default class P2BodyMarker extends SupEngine.ActorComponent {
  static Updater = P2BodyMarkerUpdater;

  mesh: THREE.Line|THREE.Mesh;
  offset = new THREE.Vector3(0, 0, 0);

  constructor(actor: SupEngine.Actor) {
    super(actor, "P2BodyMarker");
  }

  setRectangle(width: number, height: number) {
    if (this.mesh != null) this._clearRenderer();

    let geometry = new THREE.Geometry();
    geometry.vertices.push(
      new THREE.Vector3(-width / 2, -height / 2, 0),
      new THREE.Vector3( width / 2, -height / 2, 0),
      new THREE.Vector3( width / 2,  height / 2, 0),
      new THREE.Vector3(-width / 2,  height / 2, 0),
      new THREE.Vector3(-width / 2, -height / 2, 0)
    );
    let material = new THREE.LineBasicMaterial({ color: 0xf459e4 });
    this.mesh = new THREE.Line(geometry, material);
    this.actor.threeObject.add(this.mesh);
    this.mesh.position.copy(this.offset);
    this.mesh.updateMatrixWorld(false);
  }

  setCircle(radius: number) {
    if (this.mesh != null) this._clearRenderer();

    let geometry = new THREE.CircleGeometry(radius, 16);
    let material = new THREE.MeshBasicMaterial({ color: 0xf459e4, wireframe: true });
    this.mesh = new THREE.Mesh(geometry, material);
    this.actor.threeObject.add(this.mesh);
    this.mesh.position.copy(this.offset);
    this.mesh.updateMatrixWorld(false);
  }

  setOffset(xOffset: number, yOffset: number) {
    this.offset.set(xOffset, yOffset, 0);
    this.mesh.position.copy(this.offset);
    this.mesh.updateMatrixWorld(false);
  }

  _clearRenderer() {
    this.actor.threeObject.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh = null;
  }

  _destroy() {
    if (this.mesh != null) this._clearRenderer();
    super._destroy();
  }
}
