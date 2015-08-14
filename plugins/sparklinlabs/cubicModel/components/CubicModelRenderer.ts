let THREE = SupEngine.THREE;
let tmpBoneMatrix = new THREE.Matrix4;
let tmpVec = new THREE.Vector3;
let tmpQuat = new THREE.Quaternion;

import CubicModelRendererUpdater from "./CubicModelRendererUpdater";

export default class CubicModelRenderer extends SupEngine.ActorComponent {

  static Updater = CubicModelRendererUpdater;

  asset: any;
  threeRoot: THREE.Object3D;
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

    let walkNode = (node: any, parentObject: THREE.Object3D, parentOffset: { x: number; y: number; z: number; }) => {
      console.log(node.name);
      let nodeObject: THREE.Object3D;
      
      let material = new THREE.MeshBasicMaterial;
      material.side = THREE.DoubleSide;
      material.color.setRGB(Math.random(), Math.random(), Math.random());
      
      if (node.shape.type === "box") {
        let boxGeometry = new THREE.BoxGeometry(
          node.shape.width * node.shape.stretch.x,
          node.shape.height * node.shape.stretch.y,
          node.shape.depth * node.shape.stretch.z);
        boxGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(node.shape.offset.x, node.shape.offset.y, node.shape.offset.z));
        nodeObject = new THREE.Mesh(boxGeometry, material);
        nodeObject.name = node.name;
      } else {
        nodeObject = new THREE.Object3D();
      }
      
      nodeObject.position.set(node.position.x + parentOffset.x, node.position.y + parentOffset.y, node.position.z + parentOffset.z);
      nodeObject.quaternion.set(node.orientation.x, node.orientation.y, node.orientation.z, node.orientation.w);
      // NOTE: Hierarchical scale is not supported for now, we'll see if the need arises
      //nodeObject.scale.set(node.scale.x, node.scale.y, node.scale.z);
      
      parentObject.add(nodeObject);
      
      for (let childNode of node.children) walkNode(childNode, nodeObject, node.shape.offset);
    };
    
    for (let rootNode of asset.nodes) walkNode(rootNode, this.threeRoot, { x: 0, y: 0, z: 0 });

    this.actor.threeObject.add(this.threeRoot);
    this.threeRoot.updateMatrixWorld(false);
  }

  setVisible(visible: boolean) { if (this.threeRoot != null) this.threeRoot.visible = visible; }
}
