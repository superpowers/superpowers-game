const THREE = SupEngine.THREE;

import { CubicModelAssetPub } from "../data/CubicModelAsset";
import { Node } from "../data/CubicModelNodes";
import CubicModelRendererUpdater from "./CubicModelRendererUpdater";

export interface RendererNode {
  nodeId: string;
  pivot: THREE.Object3D;
  shape: THREE.Mesh;
  children: RendererNode[];
}

export default class CubicModelRenderer extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = CubicModelRendererUpdater;
  /* tslint:enable:variable-name */

  asset: CubicModelAssetPub;
  threeRoot: THREE.Object3D;
  byNodeId: { [nodeId: string]: RendererNode };

  materialType = "basic";
  // castShadow = false;
  // receiveShadow = false;

  constructor(actor: SupEngine.Actor) {
    super(actor, "ModelRenderer");
  }

  _clearMesh() {
    this.actor.threeObject.remove(this.threeRoot);
    this.threeRoot.traverse((obj: any) => { if (obj.dispose != null) obj.dispose(); });
    this.threeRoot = null;
    this.byNodeId = null;
  }

  _destroy() {
    if (this.asset != null) this._clearMesh();
    this.asset = null;
    super._destroy();
  }

  setCubicModel(asset: CubicModelAssetPub, materialType?: string, customShader?: any) {
    if (this.asset != null) this._clearMesh();
    this.asset = asset;
    if (asset == null) return;

    // Nodes
    this.threeRoot = new THREE.Object3D();
    this.threeRoot.scale.set(1 / asset.pixelsPerUnit, 1 / asset.pixelsPerUnit, 1 / asset.pixelsPerUnit);
    this.byNodeId = {};

    const walkNode = (node: any, parentRendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) => {
      const rendererNode = this._makeNode(node, parentRendererNode, parentOffset);
      for (const childNode of node.children) walkNode(childNode, rendererNode, node.shape.offset);
    };

    for (const rootNode of asset.nodes) walkNode(rootNode, null, { x: 0, y: 0, z: 0 });

    this.actor.threeObject.add(this.threeRoot);
    this.threeRoot.updateMatrixWorld(false);
  }

  _makeNode(node: Node, parentRendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) {
    let pivot: THREE.Object3D;

    const material = new THREE.MeshBasicMaterial({
      map: this.asset.textures["map"],
      side: THREE.DoubleSide,
      transparent: true
      });

    pivot = new THREE.Object3D();
    pivot.name = node.name;
    pivot.userData.cubicNodeId = node.id;

    let shape: THREE.Mesh;

    if (node.shape.type === "box") {
      const size = node.shape.settings.size;
      const boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      this.updateBoxNodeUv(boxGeometry, node);

      shape = new THREE.Mesh(boxGeometry, material);
      shape.scale.set(node.shape.settings.stretch.x, node.shape.settings.stretch.y, node.shape.settings.stretch.z);
    }

    if (shape != null) {
      shape.position.set(node.shape.offset.x, node.shape.offset.y, node.shape.offset.z);
      pivot.add(shape);
    }

    const rendererNode = { pivot, shape, nodeId: node.id, children: <RendererNode[]>[] };
    this.byNodeId[node.id] = rendererNode;
    if (parentRendererNode != null) parentRendererNode.children.push(rendererNode);

    pivot.position.set(node.position.x + parentOffset.x, node.position.y + parentOffset.y, node.position.z + parentOffset.z);
    pivot.quaternion.set(node.orientation.x, node.orientation.y, node.orientation.z, node.orientation.w);
    // NOTE: Hierarchical scale is not supported for now, we'll see if the need arises
    // nodeObject.scale.set(node.scale.x, node.scale.y, node.scale.z);

    if (parentRendererNode == null) this.threeRoot.add(pivot);
    else parentRendererNode.pivot.add(pivot);
    pivot.updateMatrixWorld(false);

    return rendererNode;
  }

  updateBoxNodeUv(geometry: THREE.Geometry, node: Node) {
    const width = this.asset.textureWidth;
    const height = this.asset.textureHeight;
    const size = node.shape.settings.size;

    let offset: { x: number; y: number; };
    const bottomLeft =  new THREE.Vector2();
    const bottomRight = new THREE.Vector2();
    const topLeft =     new THREE.Vector2();
    const topRight =    new THREE.Vector2();

    // Left Face
    offset = node.shape.textureLayout["left"].offset;
    bottomLeft.set( (offset.x)          / width, (height - offset.y - size.y) / height);
    bottomRight.set((offset.x + size.z) / width, (height - offset.y - size.y) / height);
    topLeft.set(    (offset.x)          / width, (height - offset.y)          / height);
    topRight.set(   (offset.x + size.z) / width, (height - offset.y)          / height);
    geometry.faceVertexUvs[0][2][0].copy(topLeft);
    geometry.faceVertexUvs[0][2][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][2][2].copy(topRight);
    geometry.faceVertexUvs[0][3][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][3][1].copy(bottomRight);
    geometry.faceVertexUvs[0][3][2].copy(topRight);

    // Front Face
    offset = node.shape.textureLayout["front"].offset;
    bottomLeft.set( (offset.x)          / width, (height - offset.y - size.y) / height);
    bottomRight.set((offset.x + size.x) / width, (height - offset.y - size.y) / height);
    topLeft.set(    (offset.x)          / width, (height - offset.y)          / height);
    topRight.set(   (offset.x + size.x) / width, (height - offset.y)          / height);
    geometry.faceVertexUvs[0][8][0].copy(topLeft);
    geometry.faceVertexUvs[0][8][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][8][2].copy(topRight);
    geometry.faceVertexUvs[0][9][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][9][1].copy(bottomRight);
    geometry.faceVertexUvs[0][9][2].copy(topRight);

    // Right Face
    offset = node.shape.textureLayout["right"].offset;
    bottomLeft.set( (offset.x)          / width, (height - offset.y - size.y) / height);
    bottomRight.set((offset.x + size.z) / width, (height - offset.y - size.y) / height);
    topLeft.set(    (offset.x)          / width, (height - offset.y)          / height);
    topRight.set(   (offset.x + size.z) / width, (height - offset.y)          / height);
    geometry.faceVertexUvs[0][0][0].copy(topLeft);
    geometry.faceVertexUvs[0][0][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][0][2].copy(topRight);
    geometry.faceVertexUvs[0][1][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][1][1].copy(bottomRight);
    geometry.faceVertexUvs[0][1][2].copy(topRight);

    // Back Face
    offset = node.shape.textureLayout["back"].offset;
    bottomLeft.set( (offset.x)          / width, (height - offset.y - size.y) / height);
    bottomRight.set((offset.x + size.x) / width, (height - offset.y - size.y) / height);
    topLeft.set(    (offset.x)          / width, (height - offset.y)          / height);
    topRight.set(   (offset.x + size.x) / width, (height - offset.y)          / height);
    geometry.faceVertexUvs[0][10][0].copy(topLeft);
    geometry.faceVertexUvs[0][10][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][10][2].copy(topRight);
    geometry.faceVertexUvs[0][11][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][11][1].copy(bottomRight);
    geometry.faceVertexUvs[0][11][2].copy(topRight);

    // Top Face
    offset = node.shape.textureLayout["top"].offset;
    bottomLeft.set( (offset.x)          / width, (height - offset.y - size.z) / height);
    bottomRight.set((offset.x + size.x) / width, (height - offset.y - size.z) / height);
    topLeft.set(    (offset.x)          / width, (height - offset.y)          / height);
    topRight.set(   (offset.x + size.x) / width, (height - offset.y)          / height);
    geometry.faceVertexUvs[0][4][0].copy(topLeft);
    geometry.faceVertexUvs[0][4][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][4][2].copy(topRight);
    geometry.faceVertexUvs[0][5][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][5][1].copy(bottomRight);
    geometry.faceVertexUvs[0][5][2].copy(topRight);

    // Bottom Face
    offset = node.shape.textureLayout["bottom"].offset;
    bottomLeft.set( (offset.x)          / width, (height - offset.y - size.z) / height);
    bottomRight.set((offset.x + size.x) / width, (height - offset.y - size.z) / height);
    topLeft.set(    (offset.x)          / width, (height - offset.y)          / height);
    topRight.set(   (offset.x + size.x) / width, (height - offset.y)          / height);
    geometry.faceVertexUvs[0][6][0].copy(topLeft);
    geometry.faceVertexUvs[0][6][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][6][2].copy(topRight);
    geometry.faceVertexUvs[0][7][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][7][1].copy(bottomRight);
    geometry.faceVertexUvs[0][7][2].copy(topRight);
    geometry.uvsNeedUpdate = true;
  }

  setIsLayerActive(active: boolean) { if (this.threeRoot != null) this.threeRoot.visible = active; }
}
