import * as THREE from "three";
import GameInstance from "./GameInstance";
import ActorComponent from "./ActorComponent";

let tmpMatrix = new THREE.Matrix4();
let tmpVector3 = new THREE.Vector3();
let tmpQuaternion = new THREE.Quaternion();
let tmpEuler = new THREE.Euler();

export default class Actor {
  name: string;
  parent: Actor;
  children: Actor[] = [];
  components: ActorComponent[] = [];
  layer = 0;
  pendingForDestruction = false;

  gameInstance: GameInstance;
  threeObject = new THREE.Object3D;

  constructor(gameInstance: GameInstance, name: string, parent?: Actor, options?: { visible?: boolean; layer?: number; }) {
    this.gameInstance = gameInstance;
    this.name = name;
    this.parent = parent;
    this.threeObject.userData.isActor = true;

    if (this.parent != null) {
      this.parent.children.push(this)
      this.parent.threeObject.add(this.threeObject);
      this.threeObject.updateMatrixWorld(false);
    } else {
      this.gameInstance.tree.root.push(this);
      this.gameInstance.threeScene.add(this.threeObject);
    }

    if (options != null) {
      if (options.visible === false) this.threeObject.visible = false;
      if (options.layer != null) this.layer = options.layer;
    }
  }

  awake() { for (let component of this.components.slice()) { component.awake(); } }

  setActiveLayer(layer: number) {
    let active = (this.layer === layer);
    for (let component of this.components) component.setIsLayerActive(active);
  }

  update() {
    if (this.pendingForDestruction) return;
    for (let component of this.components.slice()) { component.update(); }
  }

  // Transform
  getGlobalMatrix(matrix: THREE.Matrix4) { return matrix.copy(this.threeObject.matrixWorld); }
  getGlobalPosition(position: THREE.Vector3) { return position.setFromMatrixPosition(this.threeObject.matrixWorld); }
  getGlobalOrientation(orientation: THREE.Quaternion) { return orientation.set(0, 0, 0, 1).multiplyQuaternions(this.getParentGlobalOrientation(tmpQuaternion), this.threeObject.quaternion); }
  getGlobalEulerAngles(angles: THREE.Euler) { return angles.setFromQuaternion(this.getGlobalOrientation(tmpQuaternion)); }
  getLocalPosition(position: THREE.Vector3) { return position.copy(this.threeObject.position); }
  getLocalOrientation(orientation: THREE.Quaternion) { return orientation.copy(this.threeObject.quaternion); }
  getLocalEulerAngles(angles: THREE.Euler) { return angles.setFromQuaternion(this.threeObject.quaternion); }
  getLocalScale(scale: THREE.Vector3) { return scale.copy(this.threeObject.scale); }

  getParentGlobalOrientation(orientation: THREE.Quaternion) {
    let ancestorOrientation = new THREE.Quaternion();
    let ancestorActor = this.threeObject;
    while (ancestorActor.parent != null) {
      ancestorActor = ancestorActor.parent;
      ancestorOrientation.multiplyQuaternions(ancestorActor.quaternion, ancestorOrientation);
    }
    return ancestorOrientation;
  }

  setGlobalMatrix(matrix: THREE.Matrix4) {
    matrix.multiplyMatrices(new THREE.Matrix4().getInverse(this.threeObject.parent.matrixWorld), matrix);
    matrix.decompose(this.threeObject.position, this.threeObject.quaternion, this.threeObject.scale);
    this.threeObject.updateMatrixWorld(false);
  }

  setGlobalPosition(pos: THREE.Vector3) {
    this.threeObject.parent.worldToLocal(pos);
    this.threeObject.position.set(pos.x, pos.y, pos.z);
    this.threeObject.updateMatrixWorld(false)
  }

  setLocalPosition(pos: THREE.Vector3) {
    this.threeObject.position.copy(pos);
    this.threeObject.updateMatrixWorld(false)
  }

  lookAt(target: THREE.Vector3, up = this.threeObject.up) {
    let m = new THREE.Matrix4();
    m.lookAt(this.getGlobalPosition(tmpVector3), target, up );
    this.setGlobalOrientation(tmpQuaternion.setFromRotationMatrix(m));
  }

  lookTowards(direction: THREE.Vector3, up?: THREE.Vector3) {
    this.lookAt(this.getGlobalPosition(tmpVector3).sub(direction), up);
  }

  setLocalOrientation(quaternion: THREE.Quaternion) {
    this.threeObject.quaternion.copy(quaternion);
    this.threeObject.updateMatrixWorld(false);
  }

  setGlobalOrientation(quaternion: THREE.Quaternion) {
    let inverseParentQuaternion = new THREE.Quaternion().setFromRotationMatrix(tmpMatrix.extractRotation(this.threeObject.parent.matrixWorld)).inverse();
    quaternion.multiplyQuaternions(inverseParentQuaternion, quaternion);
    this.threeObject.quaternion.copy(quaternion);
    this.threeObject.updateMatrixWorld(false);
  }

  setLocalEulerAngles(eulerAngles: THREE.Euler) {
    this.threeObject.quaternion.setFromEuler(eulerAngles);
    this.threeObject.updateMatrixWorld(false);
  }

  setGlobalEulerAngles(eulerAngles: THREE.Euler) {
    let globalQuaternion = new THREE.Quaternion().setFromEuler(eulerAngles);
    let inverseParentQuaternion = new THREE.Quaternion().setFromRotationMatrix(tmpMatrix.extractRotation(this.threeObject.parent.matrixWorld)).inverse();
    globalQuaternion.multiplyQuaternions(inverseParentQuaternion, globalQuaternion);
    this.threeObject.quaternion.copy(globalQuaternion);
    this.threeObject.updateMatrixWorld(false);
  }

  setLocalScale(scale: THREE.Vector3) {
    this.threeObject.scale.copy(scale);
    this.threeObject.updateMatrixWorld(false);
  }

  setParent(newParent: Actor, keepLocal=false) {
    if (this.pendingForDestruction || newParent != null && newParent.pendingForDestruction) return;

    if (!keepLocal) this.getGlobalMatrix(tmpMatrix);

    let oldSiblings = (this.parent != null) ? this.parent.children : this.gameInstance.tree.root;
    oldSiblings.splice(oldSiblings.indexOf(this), 1);
    this.threeObject.parent.remove(this.threeObject);

    this.parent = newParent;

    let siblings = (newParent != null) ? newParent.children : this.gameInstance.tree.root;
    siblings.push(this);
    let threeParent = (newParent != null) ? newParent.threeObject : this.gameInstance.threeScene;
    threeParent.add(this.threeObject);

    if (!keepLocal) this.setGlobalMatrix(tmpMatrix);
    else this.threeObject.updateMatrixWorld(false);
  }

  rotateGlobal(quaternion: THREE.Quaternion) {
    this.getGlobalOrientation(tmpQuaternion);
    tmpQuaternion.multiplyQuaternions(quaternion, tmpQuaternion);
    this.setGlobalOrientation(tmpQuaternion);
  }

  rotateLocal(quaternion: THREE.Quaternion) {
    this.threeObject.quaternion.multiplyQuaternions(quaternion, this.threeObject.quaternion);
    this.threeObject.updateMatrixWorld(false);
  }

  rotateGlobalEulerAngles(eulerAngles: THREE.Euler) {
    let quaternion = new THREE.Quaternion().setFromEuler(eulerAngles);
    this.rotateGlobal(quaternion);
  }

  rotateLocalEulerAngles(eulerAngles: THREE.Euler) {
    let quaternion = new THREE.Quaternion().setFromEuler(eulerAngles);
    this.threeObject.quaternion.multiplyQuaternions(quaternion, this.threeObject.quaternion);
    this.threeObject.updateMatrixWorld(false);
  }

  moveGlobal(offset: THREE.Vector3) {
    this.getGlobalPosition(tmpVector3).add(offset);
    this.setGlobalPosition(tmpVector3);
  }

  moveLocal(offset: THREE.Vector3) {
    this.threeObject.position.add(offset);
    this.threeObject.updateMatrixWorld(false);
  }

  moveOriented(offset: THREE.Vector3) {
    offset.applyQuaternion(this.threeObject.quaternion);
    this.threeObject.position.add(offset);
    this.threeObject.updateMatrixWorld(false);
  }

  _destroy() {
    while (this.components.length > 0) this.components[0]._destroy();
    this.components = null;

    if (this.parent != null) {
      this.parent.threeObject.remove(this.threeObject);
      this.parent.children.splice(this.parent.children.indexOf(this), 1);
      this.parent = null;
    }
    else {
      this.gameInstance.tree.root.splice(this.gameInstance.tree.root.indexOf(this), 1);
      this.gameInstance.threeScene.remove(this.threeObject);
    }
    this.threeObject = null;

    let outer = (<any>this).__outer;
    if (outer != null) {
      outer.__inner = null;
      outer = null;
    }

    this.gameInstance = null;
  }

  _markDestructionPending() {
    this.pendingForDestruction = true;
    for (let child of this.children) { child._markDestructionPending(); }
  }
}
