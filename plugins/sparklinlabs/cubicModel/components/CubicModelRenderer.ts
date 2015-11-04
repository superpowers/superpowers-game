let THREE = SupEngine.THREE;
let tmpBoneMatrix = new THREE.Matrix4;
let tmpVec = new THREE.Vector3;
let tmpQuat = new THREE.Quaternion;

import { CubicModelAssetPub } from "../data/cubicModelAsset";
import { Node } from "../data/CubicModelNodes";
import CubicModelRendererUpdater from "./CubicModelRendererUpdater";

export interface RendererNode {
  nodeId: string;
  pivot: THREE.Object3D;
  shape: THREE.Mesh;
  children: RendererNode[];
}

export default class CubicModelRenderer extends SupEngine.ActorComponent {

  static Updater = CubicModelRendererUpdater;

  asset: CubicModelAssetPub;
  threeRoot: THREE.Object3D;
  byNodeId: { [nodeId: string]: RendererNode };

  materialType = "basic";
  //castShadow = false;
  //receiveShadow = false;

  constructor(actor: SupEngine.Actor) {
    super(actor, "ModelRenderer");
  }

  _clearMesh() {
    this.actor.threeObject.remove(this.threeRoot);
    this.threeRoot.traverse((obj: any) => { if (obj.dispose != null) obj.dispose() });
    this.threeRoot = null;
    this.byNodeId = null;
  }

  _destroy() {
    if (this.asset != null) this._clearMesh();
    this.asset = null;
    super._destroy();
  }

  setModel(asset: CubicModelAssetPub, materialType?: string, customShader?: any) {
    if (this.asset != null) this._clearMesh();
    this.asset = null;
    if (asset == null) return;
    this.asset = asset;

    // Nodes
    this.threeRoot = new THREE.Object3D();
    this.threeRoot.scale.set(1 / asset.pixelsPerUnit, 1 / asset.pixelsPerUnit, 1 / asset.pixelsPerUnit);
    this.byNodeId = {};

    let walkNode = (node: any, parentRendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) => {
      let rendererNode = this._makeNode(node, parentRendererNode, parentOffset);
      for (let childNode of node.children) walkNode(childNode, rendererNode, node.shape.offset);
    };

    for (let rootNode of asset.nodes) walkNode(rootNode, null, { x: 0, y: 0, z: 0 });

    this.actor.threeObject.add(this.threeRoot);
    this.threeRoot.updateMatrixWorld(false);
  }

  _makeNode(node: Node, parentRendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) {
    let pivot: THREE.Object3D;

    let material = new THREE.MeshBasicMaterial({
      map: this.asset.textures["map"],
      side: THREE.DoubleSide,
      transparent: true
      });

    pivot = new THREE.Object3D();
    pivot.name = node.name;
    pivot.userData.nodeId = node.id;

    let shape: THREE.Mesh;

    if (node.shape.type === "box") {
      let size = node.shape.settings.size;
      let boxGeometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      this.updateBoxNodeUv(boxGeometry, node)

      shape = new THREE.Mesh(boxGeometry, material);
      shape.scale.set(node.shape.settings.stretch.x, node.shape.settings.stretch.y, node.shape.settings.stretch.z);
    }

    if (shape != null) {
      shape.position.set(node.shape.offset.x, node.shape.offset.y, node.shape.offset.z);
      pivot.add(shape);
    }

    let rendererNode = { pivot, shape, nodeId: node.id, children: <RendererNode[]>[] };
    this.byNodeId[node.id] = rendererNode;
    if (parentRendererNode != null) parentRendererNode.children.push(rendererNode);

    pivot.position.set(node.position.x + parentOffset.x, node.position.y + parentOffset.y, node.position.z + parentOffset.z);
    pivot.quaternion.set(node.orientation.x, node.orientation.y, node.orientation.z, node.orientation.w);
    // NOTE: Hierarchical scale is not supported for now, we'll see if the need arises
    //nodeObject.scale.set(node.scale.x, node.scale.y, node.scale.z);

    if (parentRendererNode == null) {
      this.threeRoot.add(pivot);
    } else {
      parentRendererNode.pivot.add(pivot);
    }
    pivot.updateMatrixWorld(false);

    return rendererNode;
  }

  updateBoxNodeUv(geometry: THREE.Geometry, node: Node) {
    let width = this.asset.textureWidth;
    let size = node.shape.settings.size;
    let offset = node.shape.textureOffset;

    let bottomLeft =  new THREE.Vector2();
    let bottomRight = new THREE.Vector2();
    let topLeft =     new THREE.Vector2();
    let topRight =    new THREE.Vector2();

    // Left Face
    bottomLeft.set( (offset.x)          / width, (width - offset.y - size.z - size.y) / width);
    bottomRight.set((offset.x + size.z) / width, (width - offset.y - size.z - size.y) / width);
    topLeft.set(    (offset.x)          / width, (width - offset.y - size.z)          / width);
    topRight.set(   (offset.x + size.z) / width, (width - offset.y - size.z)          / width);
    geometry.faceVertexUvs[0][2][0].copy(topLeft);
    geometry.faceVertexUvs[0][2][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][2][2].copy(topRight);
    geometry.faceVertexUvs[0][3][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][3][1].copy(bottomRight);
    geometry.faceVertexUvs[0][3][2].copy(topRight);

    // Front Face
    bottomLeft.set( (offset.x + size.z)          / width, (width - offset.y - size.z - size.y) / width);
    bottomRight.set((offset.x + size.z + size.x) / width, (width - offset.y - size.z - size.y) / width);
    topLeft.set(    (offset.x + size.z)          / width, (width - offset.y - size.z)          / width);
    topRight.set(   (offset.x + size.z + size.x) / width, (width - offset.y - size.z)          / width);
    geometry.faceVertexUvs[0][8][0].copy(topLeft);
    geometry.faceVertexUvs[0][8][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][8][2].copy(topRight);
    geometry.faceVertexUvs[0][9][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][9][1].copy(bottomRight);
    geometry.faceVertexUvs[0][9][2].copy(topRight);

    // Right Face
    bottomLeft.set( (offset.x + size.z + size.x)     / width, (width - offset.y - size.z - size.y) / width);
    bottomRight.set((offset.x + 2 * size.z + size.x) / width, (width - offset.y - size.z - size.y) / width);
    topLeft.set(    (offset.x + size.z + size.x)     / width, (width - offset.y - size.z)          / width);
    topRight.set(   (offset.x + 2 * size.z + size.x) / width, (width - offset.y - size.z)          / width);
    geometry.faceVertexUvs[0][0][0].copy(topLeft);
    geometry.faceVertexUvs[0][0][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][0][2].copy(topRight);
    geometry.faceVertexUvs[0][1][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][1][1].copy(bottomRight);
    geometry.faceVertexUvs[0][1][2].copy(topRight);

    // Bottom Face
    bottomLeft.set( (offset.x + 2 * size.z + size.x)     / width, (width - offset.y - size.z - size.y) / width);
    bottomRight.set((offset.x + 2 * size.z + 2 * size.x) / width, (width - offset.y - size.z - size.y) / width);
    topLeft.set(    (offset.x + 2 * size.z + size.x)     / width, (width - offset.y - size.z)          / width);
    topRight.set(   (offset.x + 2 * size.z + 2 * size.x) / width, (width - offset.y - size.z)          / width);
    geometry.faceVertexUvs[0][10][0].copy(topLeft);
    geometry.faceVertexUvs[0][10][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][10][2].copy(topRight);
    geometry.faceVertexUvs[0][11][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][11][1].copy(bottomRight);
    geometry.faceVertexUvs[0][11][2].copy(topRight);

    // Top Face
    bottomLeft.set( (offset.x + size.z)          / width, (width - offset.y - size.z) / width);
    bottomRight.set((offset.x + size.z + size.x) / width, (width - offset.y - size.z) / width);
    topLeft.set(    (offset.x + size.z)          / width, (width - offset.y)          / width);
    topRight.set(   (offset.x + size.z + size.x) / width, (width - offset.y)          / width);
    geometry.faceVertexUvs[0][4][0].copy(topLeft);
    geometry.faceVertexUvs[0][4][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][4][2].copy(topRight);
    geometry.faceVertexUvs[0][5][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][5][1].copy(bottomRight);
    geometry.faceVertexUvs[0][5][2].copy(topRight);

    // Down Face
    bottomLeft.set( (offset.x + size.z + size.x)     / width, (width - offset.y - size.z) / width);
    bottomRight.set((offset.x + size.z + 2 * size.x) / width, (width - offset.y - size.z) / width);
    topLeft.set(    (offset.x + size.z + size.x)     / width, (width - offset.y)          / width);
    topRight.set(   (offset.x + size.z + 2 * size.x) / width, (width - offset.y)          / width);
    geometry.faceVertexUvs[0][6][0].copy(topLeft);
    geometry.faceVertexUvs[0][6][1].copy(bottomLeft);
    geometry.faceVertexUvs[0][6][2].copy(topRight);
    geometry.faceVertexUvs[0][7][0].copy(bottomLeft);
    geometry.faceVertexUvs[0][7][1].copy(bottomRight);
    geometry.faceVertexUvs[0][7][2].copy(topRight);
  }

  setIsLayerActive(active: boolean) { if (this.threeRoot != null) this.threeRoot.visible = active; }
}
