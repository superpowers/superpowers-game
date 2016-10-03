import * as THREE from "three";
import ActorComponent from "../ActorComponent";
import Actor from "../Actor";

export default class SelectionRenderer extends ActorComponent {
  actor: Actor;
  width: number;
  height: number;

  mesh: THREE.Line;

  constructor(actor: Actor) {
    super(actor, "SelectionRenderer");
  }

  setIsLayerActive(active: boolean) { if (this.mesh != null) this.mesh.visible = active; }

  setSize(width: number, height: number) {
    if (this.mesh != null) this._clearMesh();

    this.width = width;
    this.height = height;
    this._createMesh();
  }

  _createMesh() {
    const geometry = new THREE.Geometry();
    geometry.vertices.push(
      new THREE.Vector3(-this.width / 2, -this.height / 2, 0),
      new THREE.Vector3( this.width / 2, -this.height / 2, 0),
      new THREE.Vector3( this.width / 2,  this.height / 2, 0),
      new THREE.Vector3(-this.width / 2,  this.height / 2, 0),
      new THREE.Vector3(-this.width / 2, -this.height / 2, 0)
    );
    geometry.verticesNeedUpdate = true;
    const material = new THREE.LineBasicMaterial({ color: 0x000000, opacity: 1, depthTest: false, depthWrite: false, transparent: true });

    this.mesh = new THREE.Line(geometry, material);
    this.actor.threeObject.add(this.mesh);
    this.mesh.updateMatrixWorld(false);
  }

  _clearMesh() {
    if (this.mesh == null) return;

    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.actor.threeObject.remove(this.mesh);
    this.mesh = null;
  }

  _destroy() {
    this._clearMesh();
    super._destroy();
  }
}
