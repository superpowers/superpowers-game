let THREE = SupEngine.THREE;

export default class SelectionRenderer extends SupEngine.ActorComponent {
  meshes: THREE.Mesh[] = [];

  constructor(actor: SupEngine.Actor) {
    super(actor, "SelectionRenderer");
  }

  setIsLayerActive(active: boolean) {
    for (let mesh of this.meshes) mesh.visible = active;
  }

  setup(width: number, height: number, start: number, end: number, frameOrder: string, framesPerDirection: number) {
    this.clearMesh();

    for (let i = start; i <= end; i++) {
      let geometry = new THREE.PlaneBufferGeometry(width, height);
      let material = new THREE.MeshBasicMaterial({
        color: 0x900090,
        alphaTest: 0.1,
        transparent: true,
        opacity: 0.5
      });

      let mesh = new THREE.Mesh(geometry, material);
      this.meshes.push(mesh);

      let x: number, y: number;
      if (frameOrder === "rows") {
        x = i % framesPerDirection;
        y = Math.floor(i / framesPerDirection);
      } else {
        x = Math.floor(i / framesPerDirection);
        y = i % framesPerDirection;
      }
      mesh.position.setX((x+0.5) * width);
      mesh.position.setY(-(y+0.5) * height);
      mesh.updateMatrixWorld(false);
      this.actor.threeObject.add(mesh);
    }
  }

  clearMesh() {
    for (let mesh of this.meshes) {
      mesh.geometry.dispose();
      mesh.material.dispose();
      this.actor.threeObject.remove(mesh);
    }
    this.meshes.length = 0;
  }

  _destroy() {
    this.clearMesh();
    super._destroy();
  }
}
