let THREE = SupEngine.THREE;
import TileSet from "./TileSet";
import TileSetRendererUpdater from "./TileSetRendererUpdater";

export default class TileSetRenderer extends SupEngine.ActorComponent {

  static Updater = TileSetRendererUpdater;

  asset: TileSet;
  mesh: THREE.Mesh;
  gridRenderer: any;
  selectedTileActor: SupEngine.Actor;

  constructor(actor: SupEngine.Actor, asset?: TileSet, overrideTexture?: THREE.Texture) {
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

    let texture = (overrideTexture != null) ? overrideTexture : (asset != null) ? asset.data.texture : null;
    this.setTileSet(asset, texture);
  }

  setTileSet(asset: TileSet, texture: THREE.Texture) {
    this._clearMesh();
    this.asset = asset;
    if (this.asset == null) return;

    let geometry = new THREE.PlaneBufferGeometry(texture.image.width, texture.image.height);
    let material = new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.1, side: THREE.DoubleSide });

    this.mesh = new THREE.Mesh(geometry, material);
    this.actor.threeObject.add(this.mesh);
    this.refreshScaleRatio();
    this.selectedTileActor.threeObject.visible = true;
  }

  select(x: number, y: number, width=1, height=1) {
    let ratio = this.asset.data.grid.width / this.asset.data.grid.height;
    this.selectedTileActor.setLocalPosition(new THREE.Vector3(x, -y / ratio, 2));
    this.selectedTileActor.setLocalScale(new THREE.Vector3(width, -height / ratio, 1));
  }

  refreshScaleRatio() {
    let scaleX = 1 / this.asset.data.grid.width;
    let scaleY = 1 / this.asset.data.grid.height;
    this.mesh.scale.set(scaleX, scaleX, 1);
    let material = <THREE.MeshBasicMaterial>this.mesh.material;
    this.mesh.position.setX(material.map.image.width / 2 * scaleX);
    this.mesh.position.setY(-material.map.image.height / 2 * scaleX);
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
