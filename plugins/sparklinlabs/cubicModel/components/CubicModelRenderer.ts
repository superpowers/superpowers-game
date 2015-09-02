let THREE = SupEngine.THREE;
let tmpBoneMatrix = new THREE.Matrix4;
let tmpVec = new THREE.Vector3;
let tmpQuat = new THREE.Quaternion;

import CubicModelRendererUpdater from "./CubicModelRendererUpdater";

export interface RendererNode {
  nodeId: string;
  pivot: THREE.Object3D;
  shape: THREE.Mesh;
  children: RendererNode[];
}

export default class CubicModelRenderer extends SupEngine.ActorComponent {

  static Updater = CubicModelRendererUpdater;

  asset: any;
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

  setModel(asset: any, materialType?: string, customShader?: any) {
    if (this.asset != null) this._clearMesh();
    this.asset = null;

    if (asset == null) return;

    this.asset = asset;

    this.threeRoot = new THREE.Object3D();
    this.threeRoot.scale.set(1 / asset.unitRatio, 1 / asset.unitRatio, 1 / asset.unitRatio);

    this.byNodeId = {};

    // NOTE: This is the unoptimized variant for editing
    // There should be an option you can pass to setModel to ask for editable version vs (default) optimized

    // In the editable version,
    // We need to work with custom geometries for each shape so we can have separate textures too
    // which sucks performance-wise in principle...
    // but it's OK because they are small and it's just a model?
    // what about in the scene editor?
    // maybe load up the optimized versions of each model renderer and switch to editable as they are edited?

    // How should we piece together each texture? The ModelAsset should probably maintain the whole texture in memory
    // and dynamically update it?

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
  
  setVisible(visible: boolean) { if (this.threeRoot != null) this.threeRoot.visible = visible; }
}
