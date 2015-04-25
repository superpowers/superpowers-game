import * as THREE from "three";
import ActorComponent from "../ActorComponent";
import Actor from "../Actor";

interface data {
  width: number;
  height: number;
  direction?: number;
  orthographicScale: number;
  ratio: number;
}

export default class GridRenderer extends ActorComponent {
  width: number;
  height: number;
  direction: number;
  orthographicScale: number;
  ratio: number;

  mesh: THREE.Line;

  constructor(actor: Actor, data?: data) {
    super(actor, "GridRenderer");

    if (data != null) this.setGrid(data);
  }


  setGrid(data: data) {
    this._clearMesh();

    this.width = data.width;
    this.height = data.height;
    this.direction = (data.direction) ? data.direction : 1;
    this.orthographicScale = data.orthographicScale;
    this.ratio = data.ratio;

    this._createMesh();
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this._clearMesh();
    this._createMesh();
  }

  setOrthgraphicScale(orthographicScale: number) {
    this.orthographicScale = orthographicScale;
    this._clearMesh();
    this._createMesh();
  }

  setRatio(ratio: number) {
    this.ratio = ratio;
    this._clearMesh();
    this._createMesh();
  }

  _createMesh() {
    let geometry = new THREE.Geometry();

    // Vertical lines
    let x = 0;
    while(x <= this.width ) {
      geometry.vertices.push(new THREE.Vector3(x / this.ratio, 0, 0));
      geometry.vertices.push(new THREE.Vector3(x / this.ratio, this.direction * this.height / this.ratio, 0));
      x += 1;
    }

    // Horizontal lines
    let y = 0;
    while(y <= this.height) {
      geometry.vertices.push(new THREE.Vector3(0, this.direction * y / this.ratio, 0));
      geometry.vertices.push(new THREE.Vector3(this.width / this.ratio, this.direction * y / this.ratio, 0));
      y += 1;
    }

    geometry.computeLineDistances();

    let material = new THREE.LineDashedMaterial({
      color: 0x000000, transparent: true, opacity: 0.4,
      dashSize: 5/1000, gapSize: 5/1000, scale: 1 / this.orthographicScale
    });

    this.mesh = new THREE.Line(geometry, material, THREE.LinePieces);
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
