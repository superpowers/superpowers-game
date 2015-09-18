let THREE = SupEngine.THREE;

export default class GridHelper extends SupEngine.ActorComponent {
  gridHelper: THREE.GridHelper;
  visible = true;

  constructor(actor: SupEngine.Actor) {
    super(actor, "GridHelper");
    
    this.setSize(1);
  }
  
  setIsLayerActive(active: boolean) { this.gridHelper.visible = active && this.visible; }
  
  setSize(size: number) {
    if (this.gridHelper != null) {
      this.actor.threeObject.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      this.gridHelper.material.dispose();
    }

    this.gridHelper = new THREE.GridHelper(80 * size, size);
    this.gridHelper.color1.setRGB(1, 1, 1);
    this.gridHelper.color2.setRGB(1, 1, 1);
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
