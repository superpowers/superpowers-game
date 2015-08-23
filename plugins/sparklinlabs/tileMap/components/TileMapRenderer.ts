let THREE = SupEngine.THREE;
import TileMap from "./TileMap";
import TileSet from "./TileSet";
import TileLayerGeometry from "./TileLayerGeometry";
import TileMapRendererUpdater from "./TileMapRendererUpdater";
import { TileMapLayerPub } from "../data/TileMapLayers";

export default class TileMapRenderer extends SupEngine.ActorComponent {

  static Updater = TileMapRendererUpdater;

  tileMap: TileMap;
  tileSet: TileSet;

  castShadow = false;
  receiveShadow = false;
  materialType = "basic";
  customShader: any;

  tileSetTexture: THREE.Texture;
  layerMeshes: THREE.Mesh[];
  layerMeshesById: { [id: string]: THREE.Mesh };
  layerVisibleById: { [id: string]: boolean };

  tilesPerRow: number;
  tilesPerColumn: number;

  constructor(actor: SupEngine.Actor) {
    super(actor, "TileMapRenderer");
  }

  setTileMap(asset: TileMap, materialType?: string, customShader?: any) {
    if (this.layerMeshes != null) this._clearLayerMeshes();

    this.tileMap = asset;
    if (materialType != null) this.materialType = materialType;
    this.customShader = customShader;
    if (this.tileSet == null || this.tileMap == null) return;

    this._createLayerMeshes();
  }

  setTileSet(asset: TileSet, overrideTexture: THREE.Texture) {
    if (this.tileSetTexture != null) {
      this.tileSetTexture = null;
      if (this.tileMap != null) this._clearLayerMeshes();
    }

    this.tileSet = asset;
    if (this.tileSet == null) return;

    this._setupTexture((overrideTexture != null) ? overrideTexture : this.tileSet.data.texture);
    if (this.tileMap != null) this._createLayerMeshes();
  }

  _createLayerMeshes() {
    this.layerMeshes = [];
    this.layerMeshesById = {};
    this.layerVisibleById = {};

    for (let layerIndex = 0; layerIndex < this.tileMap.getLayersCount(); layerIndex++) {
      let layerId = this.tileMap.getLayerId(layerIndex);
      this.addLayer(layerId, layerIndex);
    }
    this.setCastShadow(this.castShadow);

    this.tileMap.on("setTileAt", this._onSetTileAt);
  }

  _clearLayerMeshes() {
    for (let layerMesh of this.layerMeshes) {
      layerMesh.geometry.dispose();
      layerMesh.material.dispose();
      this.actor.threeObject.remove(layerMesh);
    }

    this.layerMeshes = null;
    this.layerMeshesById = null;
    this.layerVisibleById = null;

    this.tileMap.removeListener("setTileAt", this._onSetTileAt);
  }

  _setupTexture(texture: THREE.Texture) {
    this.tileSetTexture = texture;
    this.tilesPerRow = this.tileSetTexture.image.width / this.tileSet.data.grid.width;
    this.tilesPerColumn = this.tileSetTexture.image.height / this.tileSet.data.grid.height;
  }

  _destroy() {
    if (this.tileSetTexture != null) {
      if (this.layerMeshes != null) this._clearLayerMeshes();
      this.tileSetTexture = null;
    }

    this.tileMap = null;
    this.tileSet = null;
    super._destroy();
  }

  addLayer(layerId: string, layerIndex: number) {
    let width = this.tileMap.getWidth() * this.tileSet.data.grid.width;
    let height = this.tileMap.getHeight() * this.tileSet.data.grid.height;
    let geometry = new TileLayerGeometry(width, height, this.tileMap.getWidth(), this.tileMap.getHeight());

    let material: THREE.MeshBasicMaterial|THREE.MeshPhongMaterial;
    if (this.materialType === "shader") {
      material = SupEngine.componentClasses["Shader"].createShaderMaterial(
        this.customShader,
        { map: this.tileSetTexture },
        geometry
      );
      (<any>material).map = this.tileSetTexture;

    } else {
      if (this.materialType === "basic") material = new THREE.MeshBasicMaterial();
      else if (this.materialType === "phong") material = new THREE.MeshPhongMaterial();
      material.map = this.tileSetTexture;
      material.alphaTest = 0.1;
      material.side = THREE.DoubleSide;
      material.transparent = true;
    }

    let layerMesh = new THREE.Mesh(geometry, material);
    layerMesh.receiveShadow = this.receiveShadow;

    let scaleRatio = 1 / this.tileMap.getPixelsPerUnit();
    layerMesh.scale.set(scaleRatio, scaleRatio, 1);
    layerMesh.updateMatrixWorld(false);

    this.layerMeshes.splice(layerIndex, 0, layerMesh);
    this.layerMeshesById[layerId] = layerMesh;
    this.layerVisibleById[layerId] = true;
    this.actor.threeObject.add(layerMesh);

    for (let y = 0; y < this.tileMap.getHeight(); y++) {
      for (let x = 0; x < this.tileMap.getWidth(); x++) {
        this.refreshTileAt(layerIndex, x, y);
      }
    }

    this.refreshLayersDepth();
  }

  deleteLayer(layerIndex: number) {
    this.actor.threeObject.remove(this.layerMeshes[layerIndex]);
    this.layerMeshes.splice(layerIndex, 1);

    this.refreshLayersDepth();
  }

  moveLayer(layerId: string, newIndex: number) {
    let layer = this.layerMeshesById[layerId];
    let oldIndex = this.layerMeshes.indexOf(layer);
    this.layerMeshes.splice(oldIndex, 1);

    if (oldIndex < newIndex) newIndex--;
    this.layerMeshes.splice(newIndex, 0, layer);

    this.refreshLayersDepth();
  }

  setCastShadow(castShadow: boolean) {
    this.castShadow = castShadow;
    for (let layerMesh of this.layerMeshes) layerMesh.castShadow = castShadow;
    if (! castShadow) return;

    this.actor.gameInstance.threeScene.traverse((object: any) => {
      let material: THREE.Material = object.material;
      if (material != null) material.needsUpdate = true;
    })
  }

  setReceiveShadow(receiveShadow: boolean) {
    this.receiveShadow = receiveShadow;
    for (let layerMesh of this.layerMeshes) {
      layerMesh.receiveShadow = receiveShadow;
      layerMesh.material.needsUpdate = true;
    }
  }

  refreshPixelsPerUnit(pixelsPerUnit: number) {
    let scaleRatio = 1 / this.tileMap.getPixelsPerUnit();
    for (let layerMesh of this.layerMeshes) {
      layerMesh.scale.set(scaleRatio, scaleRatio, 1);
      layerMesh.updateMatrixWorld(false);
    }
  }

  refreshLayersDepth() {
    for (let layerMeshIndex = 0; layerMeshIndex < this.layerMeshes.length; layerMeshIndex++) {
      let layerMesh = this.layerMeshes[layerMeshIndex];
      layerMesh.position.setZ(layerMeshIndex * this.tileMap.getLayersDepthOffset());
      layerMesh.updateMatrixWorld(false);
    }
  }

  refreshEntireMap() {
    for (let layerIndex = 0; layerIndex < this.tileMap.getLayersCount(); layerIndex++) {
      for (let y = 0; y < this.tileMap.getWidth(); y++) {
        for (let x = 0; x < this.tileMap.getHeight(); x++) {
          this.refreshTileAt(layerIndex, x, y);
        }
      }
    }

    this.refreshLayersDepth();
  }

  _onSetTileAt = (layerIndex: number, x: number, y: number) => { this.refreshTileAt(layerIndex, x, y); }

  refreshTileAt(layerIndex: number, x: number, y: number) {
    let tileInfo = this.tileMap.getTileAt(layerIndex, x, y);
    let tileX = <number>tileInfo[0];
    let tileY = <number>tileInfo[1];
    let flipX = <boolean>tileInfo[2];
    let flipY = <boolean>tileInfo[3];
    let angle = <number>tileInfo[4];

    if (tileX == -1 || tileY == -1 || tileX >= this.tilesPerRow || tileY >= this.tilesPerColumn) {
      tileX = this.tilesPerRow - 1;
      tileY = this.tilesPerColumn - 1;
    }

    let left   = (tileX     * this.tileSet.data.grid.width + 0.2) / this.tileSetTexture.image.width;
    let right  = ((tileX+1) * this.tileSet.data.grid.width - 0.2) / this.tileSetTexture.image.width;
    let bottom = 1 - ((tileY+1) * this.tileSet.data.grid.height - 0.2) / this.tileSetTexture.image.height;
    let top    = 1 - (tileY     * this.tileSet.data.grid.height + 0.2) / this.tileSetTexture.image.height;

    if (flipX) {
      let temp = right;
      right = left;
      left = temp;
    }

    if (flipY) {
      let temp = bottom;
      bottom = top;
      top = temp;
    }

    let quadIndex = (x + y * this.tileMap.getWidth());
    let layerMesh = this.layerMeshes[layerIndex];
    let uvs = (<any>layerMesh.geometry).getAttribute("uv");
    uvs.needsUpdate = true;

    switch (angle) {
      case 0:
        uvs.array[quadIndex * 8 + 0] = left;
        uvs.array[quadIndex * 8 + 1] = bottom;

        uvs.array[quadIndex * 8 + 2] = right;
        uvs.array[quadIndex * 8 + 3] = bottom;

        uvs.array[quadIndex * 8 + 4] = right;
        uvs.array[quadIndex * 8 + 5] = top;

        uvs.array[quadIndex * 8 + 6] = left;
        uvs.array[quadIndex * 8 + 7] = top;
        break;

      case 90:
        uvs.array[quadIndex * 8 + 0] = left;
        uvs.array[quadIndex * 8 + 1] = top;

        uvs.array[quadIndex * 8 + 2] = left;
        uvs.array[quadIndex * 8 + 3] = bottom;

        uvs.array[quadIndex * 8 + 4] = right;
        uvs.array[quadIndex * 8 + 5] = bottom;

        uvs.array[quadIndex * 8 + 6] = right;
        uvs.array[quadIndex * 8 + 7] = top;
        break;

      case 180:
        uvs.array[quadIndex * 8 + 0] = right;
        uvs.array[quadIndex * 8 + 1] = top;

        uvs.array[quadIndex * 8 + 2] = left;
        uvs.array[quadIndex * 8 + 3] = top;

        uvs.array[quadIndex * 8 + 4] = left;
        uvs.array[quadIndex * 8 + 5] = bottom;

        uvs.array[quadIndex * 8 + 6] = right;
        uvs.array[quadIndex * 8 + 7] = bottom;
        break;

      case 270:
        uvs.array[quadIndex * 8 + 0] = right;
        uvs.array[quadIndex * 8 + 1] = bottom;

        uvs.array[quadIndex * 8 + 2] = right;
        uvs.array[quadIndex * 8 + 3] = top;

        uvs.array[quadIndex * 8 + 4] = left;
        uvs.array[quadIndex * 8 + 5] = top;

        uvs.array[quadIndex * 8 + 6] = left;
        uvs.array[quadIndex * 8 + 7] = bottom;
        break;
    }
  }

  setVisible(visible: boolean) {
    if (this.layerMeshes == null) return;

    for (let layerId in this.layerMeshesById)
      this.layerMeshesById[layerId].visible = visible ? this.layerVisibleById[layerId]: false;
  }
}
