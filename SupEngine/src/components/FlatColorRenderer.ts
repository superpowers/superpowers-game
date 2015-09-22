import * as THREE from "three";
import ActorComponent from "../ActorComponent";
import Actor from "../Actor";

export default class FlatColorRenderer extends ActorComponent {
  color: string;
  width: number;
  height: number;

  mesh: THREE.Mesh;
  texture: THREE.Texture;

  constructor(actor: Actor, color: number, scaleRatio: number, width: number, height: number) {
    super(actor, "GridRenderer");

    this.setup(color, scaleRatio, width, height);
  }

  setIsLayerActive(active: boolean) { this.mesh.visible = active; }

  setup(color: number, scaleRatio: number, width: number, height: number) {
    if (color == null || scaleRatio == null || width == null) return;
    this._clearMesh();

    this.width = width;
    this.height = (height) ? height : this.width;

    let geometry = new THREE.PlaneBufferGeometry(this.width, this.height);
    let material = new THREE.MeshBasicMaterial({
      color: color,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.actor.threeObject.add(this.mesh);
    this.refreshScale(scaleRatio);
  }

  refreshScale(scaleRatio: number) {
    this.mesh.scale.set(scaleRatio, scaleRatio, scaleRatio);
    this.mesh.position.set(this.width / 2 * scaleRatio, this.height / 2 * scaleRatio, -0.01);
    this.mesh.updateMatrixWorld(false);
  }

  _clearMesh() {
    if (this.mesh == null) return

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
