import P2BodyMarkerUpdater from "./P2BodyMarkerUpdater";

let THREE = SupEngine.THREE;
let tmpVector3 = new THREE.Vector3();
let tmpEulerAngles = new THREE.Euler();

export default class P2BodyMarker extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = P2BodyMarkerUpdater;
  /* tslint:enable:variable-name */

  markerActor: SupEngine.Actor;
  mesh: THREE.Line|THREE.Mesh;
  offset = new THREE.Vector3(0, 0, 0);
  angle = 0;

  constructor(actor: SupEngine.Actor) {
    super(actor, "P2BodyMarker");

    this.markerActor = new SupEngine.Actor(this.actor.gameInstance, `Marker`, null, { layer: -1 });
  }

  setIsLayerActive(active: boolean) {
    if (this.mesh != null) this.mesh.visible = active;
  }

  update() {
    super.update();

    this.actor.getGlobalPosition(tmpVector3);
    this.markerActor.setGlobalPosition(tmpVector3);

    this.actor.getGlobalEulerAngles(tmpEulerAngles);
    tmpEulerAngles.x = tmpEulerAngles.y = 0;
    tmpEulerAngles.z += this.angle;
    this.markerActor.setGlobalEulerAngles(tmpEulerAngles);
  }

  setBox(width: number, height: number) {
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
    this.markerActor.threeObject.add(this.mesh);
    this.mesh.position.copy(this.offset);
    this.mesh.updateMatrixWorld(false);
  }

  setCircle(radius: number) {
    if (this.mesh != null) this._clearRenderer();

    let geometry = new THREE.CircleGeometry(radius, 16);
    let material = new THREE.MeshBasicMaterial({ color: 0xf459e4, wireframe: true });
    this.mesh = new THREE.Mesh(geometry, material);
    this.markerActor.threeObject.add(this.mesh);
    this.mesh.position.copy(this.offset);
    this.mesh.updateMatrixWorld(false);
  }

  setOffset(xOffset: number, yOffset: number) {
    this.offset.set(xOffset, yOffset, 0);
    this.mesh.position.copy(this.offset);
    this.mesh.updateMatrixWorld(false);
  }

  setAngle(angle: number) {
    this.angle = angle * (Math.PI / 180);
  }

  _clearRenderer() {
    this.markerActor.threeObject.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.mesh = null;
  }

  _destroy() {
    if (this.mesh != null) this._clearRenderer();
    this.actor.gameInstance.destroyActor(this.markerActor);
    super._destroy();
  }
}
