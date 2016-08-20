let THREE = SupEngine.THREE;
import TileSet from "./TileSet";
import TileSetRendererUpdater from "./TileSetRendererUpdater";

export default class TileSetRenderer extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = TileSetRendererUpdater;
  /* tslint:enable:variable-name */

  asset: TileSet;

  private material = new THREE.MeshBasicMaterial({ alphaTest: 0.1, side: THREE.DoubleSide, transparent: true });
  mesh: THREE.Mesh;
  gridRenderer: any;
  selectedTileActor: SupEngine.Actor;

  constructor(actor: SupEngine.Actor, asset?: TileSet) {
    super(actor, "TileSetRenderer");

    let gridActor = new SupEngine.Actor(this.actor.gameInstance, "Grid");
    gridActor.setLocalPosition(new THREE.Vector3(0, 0, 1));
    this.gridRenderer = new SupEngine.editorComponentClasses["GridRenderer"](gridActor, {
      width: 1, height: 1,
      direction: -1, orthographicScale: 10,
      ratio: { x: 1, y: 1 }
    });

    this.selectedTileActor = new SupEngine.Actor(this.actor.gameInstance, "Selection", null, { visible: false });
    new SupEngine.editorComponentClasses["FlatColorRenderer"](this.selectedTileActor, 0x900090, 1, 1);

    this.setTileSet(asset);
  }

  setTileSet(asset: TileSet) {
    this._clearMesh();
    this.asset = asset;
    if (this.asset == null) return;

    const geometry = new THREE.PlaneBufferGeometry(asset.data.texture.image.width, asset.data.texture.image.height);
    this.material.map = asset.data.texture;

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.actor.threeObject.add(this.mesh);
    this.refreshScaleRatio();
    this.selectedTileActor.threeObject.visible = true;
  }

  select(x: number, y: number, width = 1, height = 1) {
    let ratio = this.asset.data.grid.width / this.asset.data.grid.height;
    this.selectedTileActor.setLocalPosition(new THREE.Vector3(x, -y / ratio, 2));
    this.selectedTileActor.setLocalScale(new THREE.Vector3(width, -height / ratio, 1));
  }

  refreshScaleRatio() {
    let scaleX = 1 / this.asset.data.grid.width;
    let scaleY = 1 / this.asset.data.grid.height;
    this.mesh.scale.set(scaleX, scaleY, 1);
    let material = <THREE.MeshBasicMaterial>this.mesh.material;
    this.mesh.position.setX(material.map.image.width / 2 * scaleX);
    this.mesh.position.setY(-material.map.image.height / 2 * scaleY);
    this.mesh.updateMatrixWorld(false);

    this.select(0, 0);
  }

  _clearMesh() {
    if (this.mesh == null) return;

    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.actor.threeObject.remove(this.mesh);
    this.mesh = null;
    this.selectedTileActor.threeObject.visible = false;
  }

  _destroy() {
    this._clearMesh();
    this.actor.gameInstance.destroyActor(this.gridRenderer.actor);
    this.actor.gameInstance.destroyActor(this.selectedTileActor);
    this.asset = null;
    super._destroy();
  }

  setIsLayerActive(active: boolean) { if (this.mesh != null) this.mesh.visible = active; }
}
