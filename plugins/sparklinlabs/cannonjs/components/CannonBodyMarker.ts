let THREE = SupEngine.THREE;

import CannonBodyMarkerUpdater from "./CannonBodyMarkerUpdater";

export default
class CannonBodyMarker extends SupEngine.ActorComponent {

  static Updater = CannonBodyMarkerUpdater;

  mesh:THREE.Mesh;

  constructor(actor:SupEngine.Actor) {
    super(actor, "CannonBodyMarker")
  }

  setBox(size:any) {
    if (this.mesh != null) this._clearRenderer();

    let geometry = new THREE.BoxGeometry(size.halfWidth * 2, size.halfHeight * 2, size.halfDepth * 2);
    let material = new THREE.MeshBasicMaterial({wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2});
    this.mesh = new THREE.Mesh(geometry, material);
    this.actor.threeObject.add(this.mesh);
    this.mesh.updateMatrixWorld(false);
  }

  setSphere(radius:number) {
    if (this.mesh != null) this._clearRenderer();

    let geometry = new THREE.SphereGeometry(radius);
    let material = new THREE.MeshBasicMaterial({wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2});
    this.mesh = new THREE.Mesh(geometry, material);
    this.actor.threeObject.add(this.mesh);
    this.mesh.updateMatrixWorld(false)
  }

  setCylinder(radius:number, height:number) {
    if (this.mesh != null) this._clearRenderer();

    let geometry = new THREE.CylinderGeometry(radius, radius, height);
    let material = new THREE.MeshBasicMaterial({wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2});
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    this.actor.threeObject.add(this.mesh);
    this.mesh.updateMatrixWorld(false);
  }

  setOffset(offset:any) {
    this.mesh.position.setX(offset.x);
    this.mesh.position.setY(offset.y);
    this.mesh.position.setZ(offset.z);
    this.mesh.updateMatrixWorld(false)

  }

  _clearRenderer() {
    this.actor.threeObject.remove(this.mesh);
    this.mesh.traverse((obj:any) => {
     if(obj.dispose != null) obj.dispose();
     });
    this.mesh = null

  }

  _destroy() {
    if (this.mesh != null) this._clearRenderer();
    super._destroy()

  }

}