import CannonBodyMarkerUpdater from "./CannonBodyMarkerUpdater";

let THREE = SupEngine.THREE;
let tmpVector3 = new THREE.Vector3();
let tmpEulerAngles = new THREE.Euler();

export default
class CannonBodyMarker extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = CannonBodyMarkerUpdater;
  /* tslint:enable:variable-name */

  markerActor: SupEngine.Actor;
  mesh: THREE.Mesh;

  constructor(actor: SupEngine.Actor) {
    super(actor, "CannonBodyMarker");

    this.markerActor = new SupEngine.Actor(this.actor.gameInstance, `Marker`, null, { layer: -1 });
  }

  setIsLayerActive(active: boolean) { if (this.mesh != null) this.mesh.visible = active; }

  update() {
    super.update();

    this.actor.getGlobalPosition(tmpVector3);
    this.markerActor.setGlobalPosition(tmpVector3);

    this.actor.getGlobalEulerAngles(tmpEulerAngles);
    this.markerActor.setGlobalEulerAngles(tmpEulerAngles);
  }

  setBox(orientationOffset: any, halfSize: any) {
    if (this.mesh != null) this._clearRenderer();
    let geometry = new THREE.BoxGeometry(halfSize.x * 2, halfSize.y * 2, halfSize.z * 2);
    let material = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.quaternion.setFromEuler(new THREE.Euler(
      THREE.Math.degToRad(orientationOffset.x),
      THREE.Math.degToRad(orientationOffset.y),
      THREE.Math.degToRad(orientationOffset.z)
    ));
    this.markerActor.threeObject.add(this.mesh);
    this.mesh.updateMatrixWorld(false);
  }
  setSphere(radius: number) {
    if (this.mesh != null) this._clearRenderer();
    let geometry = new THREE.SphereGeometry(radius);
    let material = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.markerActor.threeObject.add(this.mesh);
    this.mesh.updateMatrixWorld(false);
  }
  setCylinder(orientationOffset: any, radius: number, height: number, segments: number) {
    if (this.mesh != null) this._clearRenderer();
    let geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    let material = new THREE.MeshBasicMaterial({ wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.quaternion.setFromEuler(new THREE.Euler(
      THREE.Math.degToRad((orientationOffset.x + 90)),
      THREE.Math.degToRad(orientationOffset.y),
      THREE.Math.degToRad(orientationOffset.z)
    ));
    this.markerActor.threeObject.add(this.mesh);
    this.mesh.updateMatrixWorld(false);
  }

  setPositionOffset(positionOffset: any) {
    this.mesh.position.copy(positionOffset);
    this.mesh.updateMatrixWorld(false);
  }

  _clearRenderer() {
    this.markerActor.threeObject.remove(this.mesh);
    this.mesh.traverse((obj: any) => {
     if (obj.dispose != null) obj.dispose();
    });
    this.mesh = null;
  }

  _destroy() {
    if (this.mesh != null) this._clearRenderer();
    super._destroy();
  }
}
