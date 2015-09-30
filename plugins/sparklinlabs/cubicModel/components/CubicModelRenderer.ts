let THREE = SupEngine.THREE;
let tmpBoneMatrix = new THREE.Matrix4;
let tmpVec = new THREE.Vector3;
let tmpQuat = new THREE.Quaternion;

import { CubicModelAssetPub } from "../data/cubicModelAsset";
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

  // TODO: Support multiple maps
  textureCtx: CanvasRenderingContext2D;
  threeTexture: THREE.Texture;

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

    // Texturing
    // NOTE: This is the unoptimized variant for editing
    // There should be an option you can pass to setModel to ask for editable version vs (default) optimized
    let canvas = document.createElement("canvas");
    canvas.width = asset.textureWidth;
    canvas.height = asset.textureHeight;
    this.textureCtx = canvas.getContext("2d");
    this.threeTexture = new THREE.Texture(canvas);
    this.threeTexture.needsUpdate = true;
    this.threeTexture.magFilter = THREE.NearestFilter;
    this.threeTexture.minFilter = THREE.NearestFilter;

    let imageData = new ImageData(new Uint8ClampedArray(asset.maps["map"]), asset.textureWidth, asset.textureHeight);
    this.textureCtx.putImageData(imageData, 0, 0);

    // Nodes
    this.threeRoot = new THREE.Object3D();
    this.threeRoot.scale.set(1 / asset.unitRatio, 1 / asset.unitRatio, 1 / asset.unitRatio);
    this.byNodeId = {};

    let walkNode = (node: any, parentRendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) => {
      let rendererNode = this._makeNode(node, parentRendererNode, parentOffset);
      for (let childNode of node.children) walkNode(childNode, rendererNode, node.shape.offset);
    };

    for (let rootNode of asset.nodes) walkNode(rootNode, null, { x: 0, y: 0, z: 0 });

    this.actor.threeObject.add(this.threeRoot);
    this.threeRoot.updateMatrixWorld(false);
  }

  _makeNode(node: any, parentRendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) {
    let pivot: THREE.Object3D;

    let material = new THREE.MeshBasicMaterial;
    material.side = THREE.DoubleSide;
    material.color.setRGB(Math.random(), Math.random(), Math.random());

    pivot = new THREE.Object3D();
    pivot.name = node.name;
    pivot.userData.nodeId = node.id;

    let shape: THREE.Mesh;

    if (node.shape.type === "box") {
      let boxGeometry = new THREE.BoxGeometry(
        node.shape.settings.size.x, node.shape.settings.size.y, node.shape.settings.size.z
      );

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

  setIsLayerActive(active: boolean) { if (this.threeRoot != null) this.threeRoot.visible = active; }
}
