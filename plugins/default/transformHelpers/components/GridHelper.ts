const THREE = SupEngine.THREE;

export default class GridHelper extends SupEngine.ActorComponent {
  gridHelper: THREE.GridHelper;
  visible = true;

  constructor(actor: SupEngine.Actor, size: number, step: number) {
    super(actor, "GridHelper");

    this.setup(size, step);
  }

  setIsLayerActive(active: boolean) { this.gridHelper.visible = active && this.visible; }

  setup(size: number, step: number) {
    if (this.gridHelper != null) {
      this.actor.threeObject.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper.material.dispose();
    }

    const actualSize = Math.ceil(size / step) * step;

    this.gridHelper = new THREE.GridHelper(actualSize, actualSize / step * 2, new THREE.Color(1, 1, 1), new THREE.Color(1, 1, 1));
    this.gridHelper.material.transparent = true;
    this.gridHelper.material.opacity = 0.25;
    this.actor.threeObject.add(this.gridHelper);
    this.gridHelper.visible = this.visible;
    this.gridHelper.updateMatrixWorld(false);
  }

  setVisible(visible: boolean) {
    this.gridHelper.visible = this.visible = visible;
  }
}
