let THREE = SupEngine.THREE;

export default class SelectionBox extends SupEngine.ActorComponent {
  line: THREE.Line;
  geometry: THREE.Geometry;
  target: SupEngine.Actor;

  constructor(actor: SupEngine.Actor) {
    super(actor, "SelectionBox");

    this.geometry = new THREE.Geometry();
    for (let i = 0; i < 24; i++) this.geometry.vertices.push(new THREE.Vector3(0,0,0));
    this.line = new THREE.Line(this.geometry, new THREE.LineBasicMaterial({ color: 0x00ffff, opacity: 1, depthTest: false, depthWrite: false, transparent: true }), THREE.LinePieces);
    this.actor.threeObject.add(this.line);
    this.line.updateMatrixWorld(false);
    this.line.visible = false;
  }

  setTarget(actor: SupEngine.Actor) {
    this.target = actor;

    if (this.target != null) {
      this.line.visible = true;
      this.move();
      this.resize();
    } else {
      this.line.visible = false;
    }
  }

  move() {
    this.actor.threeObject.position.copy(this.target.getGlobalPosition());
    this.actor.threeObject.quaternion.copy(this.target.getGlobalOrientation());
    this.actor.threeObject.updateMatrixWorld(false);
  }

  resize() {
    this.line.visible = true;

    let vec = new THREE.Vector3();
    let box = new THREE.Box3();
    let inverseTargetMatrixWorld = new THREE.Matrix4().compose(this.target.getGlobalPosition(), this.target.getGlobalOrientation(), <THREE.Vector3>{ x: 1, y: 1, z: 1 });

    inverseTargetMatrixWorld.getInverse(inverseTargetMatrixWorld);

    this.target.threeObject.traverse((node) => {
      let geometry: THREE.Geometry|THREE.BufferGeometry = (<any>node).geometry;

      if (geometry != null) {
        node.updateMatrixWorld(false);

				if (geometry instanceof THREE.Geometry) {
					let vertices = geometry.vertices;

					for (let i = 0, il = vertices.length; i < il; i++) {
            vec.copy(vertices[i]).applyMatrix4(node.matrixWorld).applyMatrix4(inverseTargetMatrixWorld);
						box.expandByPoint(vec);
					}

        } else if (geometry instanceof THREE.BufferGeometry && (<any>geometry.attributes)["position"] != null) {
					let positions: Float32Array = (<any>geometry.attributes)["position"].array;

					for (let i = 0, il = positions.length; i < il; i += 3) {
						vec.set(positions[i], positions[i + 1], positions[i + 2]);
            vec.applyMatrix4(node.matrixWorld).applyMatrix4(inverseTargetMatrixWorld);
						box.expandByPoint(vec);
					}
				}
      }
    });

    let min = box.min;
    let max = box.max;

    // Front
    this.geometry.vertices[0].set(max.x, min.y, min.z);
    this.geometry.vertices[1].set(min.x, min.y, min.z);
    this.geometry.vertices[2].set(min.x, min.y, min.z);
    this.geometry.vertices[3].set(min.x, max.y, min.z);
    this.geometry.vertices[4].set(min.x, max.y, min.z);
    this.geometry.vertices[5].set(max.x, max.y, min.z);
    this.geometry.vertices[6].set(max.x, max.y, min.z);
    this.geometry.vertices[7].set(max.x, min.y, min.z);

    // Back
    this.geometry.vertices[8].set( min.x, max.y, max.z);
    this.geometry.vertices[9].set( max.x, max.y, max.z);
    this.geometry.vertices[10].set(max.x, max.y, max.z);
    this.geometry.vertices[11].set(max.x, min.y, max.z);
    this.geometry.vertices[12].set(max.x, min.y, max.z);
    this.geometry.vertices[13].set(min.x, min.y, max.z);
    this.geometry.vertices[14].set(min.x, min.y, max.z);
    this.geometry.vertices[15].set(min.x, max.y, max.z);

    // Lines
    this.geometry.vertices[16].set(max.x, min.y, min.z);
    this.geometry.vertices[17].set(max.x, min.y, max.z);
    this.geometry.vertices[18].set(max.x, max.y, min.z);
    this.geometry.vertices[19].set(max.x, max.y, max.z);
    this.geometry.vertices[20].set(min.x, max.y, min.z);
    this.geometry.vertices[21].set(min.x, max.y, max.z);
    this.geometry.vertices[22].set(min.x, min.y, min.z);
    this.geometry.vertices[23].set(min.x, min.y, max.z);

    this.geometry.verticesNeedUpdate = true;
  }

  _destroy() {
    this.actor.threeObject.remove(this.line);
    this.line.geometry.dispose();
    this.line.material.dispose();
    this.line = null;

    super._destroy();
  }
}
