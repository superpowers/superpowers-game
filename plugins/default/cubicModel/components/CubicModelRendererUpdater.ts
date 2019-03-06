import CubicModelAsset, { DuplicatedNode } from "../data/CubicModelAsset";
import { Node } from "../data/CubicModelNodes";
import CubicModelRenderer, { RendererNode } from "./CubicModelRenderer";
const THREE = SupEngine.THREE;

export default class CubicModelRendererUpdater {
  client: SupClient.ProjectClient;
  cubicModelRenderer: CubicModelRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  cubicModelAssetId: string;
  cubicModelAsset: CubicModelAsset = null;

  cubicModelSubscriber = {
    onAssetReceived: this._onCubicModelAssetReceived.bind(this),
    onAssetEdited: this._onCubicModelAssetEdited.bind(this),
    onAssetTrashed: this._onCubicModelAssetTrashed.bind(this)
  };

  constructor(client: SupClient.ProjectClient, cubicModelRenderer: CubicModelRenderer, config: any,
  receiveAssetCallbacks?: any, editAssetCallbacks?: any) {
    this.client = client;
    this.cubicModelRenderer = cubicModelRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.cubicModelAssetId = config.cubicModelAssetId;

    if (this.cubicModelAssetId != null) this.client.subAsset(this.cubicModelAssetId, "cubicModel", this.cubicModelSubscriber);
  }

  destroy() {
    if (this.cubicModelAssetId != null) this.client.unsubAsset(this.cubicModelAssetId, this.cubicModelSubscriber);
  }

  _onCubicModelAssetReceived(assetId: string, asset: CubicModelAsset) {
    this.cubicModelAsset = asset;
    this._setCubicModel();
    if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.cubicModel();
  }

  _setCubicModel() {
    if (this.cubicModelAsset == null) {
      this.cubicModelRenderer.setCubicModel(null);
      return;
    }

    this.cubicModelRenderer.setCubicModel(this.cubicModelAsset.pub);
  }

  _onCubicModelAssetEdited(id: string, command: string, ...args: any[]) {
    const commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null) {
      const editCallback = this.editAssetCallbacks.cubicModel[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onEditCommand_setProperty(path: string, value: any) {
    switch (path) {
      case "pixelsPerUnit":
        const scale = 1 / value;
        this.cubicModelRenderer.threeRoot.scale.set(scale, scale, scale);
        this.cubicModelRenderer.threeRoot.updateMatrixWorld(false);
        break;
    }
  }

  _onEditCommand_addNode(node: Node, parentId: string, index: number) {
    this._createRendererNode(node);
  }

  _createRendererNode(node: Node) {
    const parentNode = this.cubicModelAsset.nodes.parentNodesById[node.id];
    const parentRendererNode = (parentNode != null) ? this.cubicModelRenderer.byNodeId[parentNode.id] : null;

    const offset = (parentNode != null) ? parentNode.shape.offset : { x: 0, y: 0, z: 0 };
    this.cubicModelRenderer._makeNode(node, parentRendererNode, offset);
  }

  _onEditCommand_moveNode(id: string, parentId: string, index: number) {
    const rendererNode = this.cubicModelRenderer.byNodeId[id];
    const pivot = rendererNode.pivot;
    const matrix = pivot.matrixWorld.clone();

    const previousParentId = pivot.parent.userData.cubicNodeId;
    if (previousParentId != null) {
      const parentNode = this.cubicModelRenderer.byNodeId[previousParentId];
      parentNode.children.splice(parentNode.children.indexOf(rendererNode), 1);
    }

    const parent = (parentId != null) ? this.cubicModelRenderer.byNodeId[parentId].pivot : this.cubicModelRenderer.threeRoot;
    parent.add(pivot);

    matrix.multiplyMatrices(new THREE.Matrix4().getInverse(parent.matrixWorld), matrix);
    matrix.decompose(pivot.position, pivot.quaternion, pivot.scale);
    pivot.updateMatrixWorld(false);
  }

  _onEditCommand_moveNodePivot(id: string, value: { x: number; y: number; z: number; }) {
    const rendererNode = this.cubicModelRenderer.byNodeId[id];
    const node = this.cubicModelAsset.nodes.byId[id];

    const parentNode = this.cubicModelAsset.nodes.parentNodesById[id];
    const parentOffset = (parentNode != null) ? parentNode.shape.offset : { x: 0, y: 0, z: 0 };
    rendererNode.pivot.position.set(value.x + parentOffset.x, value.y + parentOffset.y, value.z + parentOffset.z);
    rendererNode.pivot.quaternion.set(node.orientation.x, node.orientation.y, node.orientation.z, node.orientation.w);
    rendererNode.shape.position.set(node.shape.offset.x, node.shape.offset.y, node.shape.offset.z);

    const walk = (rendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) => {
      const node = this.cubicModelAsset.nodes.byId[rendererNode.nodeId];
      rendererNode.pivot.position.set(node.position.x + parentOffset.x, node.position.y + parentOffset.y, node.position.z + parentOffset.z);

      for (const child of rendererNode.children) walk(child, node.shape.offset);
    };
    for (const child of rendererNode.children) walk(child, node.shape.offset);

    rendererNode.pivot.updateMatrixWorld(false);
  }

  _onEditCommand_setNodeProperty(id: string, path: string, value: any) {
    const rendererNode = this.cubicModelRenderer.byNodeId[id];
    const node = this.cubicModelAsset.nodes.byId[id];

    switch (path) {
      case "name":
        rendererNode.pivot.name = value;
        break;

      case "position":
        const parentNode = this.cubicModelAsset.nodes.parentNodesById[id];
        const parentOffset = (parentNode != null) ? parentNode.shape.offset : { x: 0, y: 0, z: 0 };
        rendererNode.pivot.position.set(value.x + parentOffset.x, value.y + parentOffset.y, value.z + parentOffset.z);
        rendererNode.pivot.updateMatrixWorld(false);
        break;

      case "orientation":
        rendererNode.pivot.quaternion.set(value.x, value.y, value.z, value.w);
        rendererNode.pivot.updateMatrixWorld(false);
        break;

      case "shape.offset":
        rendererNode.shape.position.set(value.x, value.y, value.z);

        const walk = (rendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) => {
          const node = this.cubicModelAsset.nodes.byId[rendererNode.nodeId];
          rendererNode.pivot.position.set(node.position.x + parentOffset.x, node.position.y + parentOffset.y, node.position.z + parentOffset.z);

          for (const child of rendererNode.children) walk(child, node.shape.offset);
        };
        for (const child of rendererNode.children) walk(child, node.shape.offset);

        rendererNode.pivot.updateMatrixWorld(false);
        break;

      default: {
        switch (node.shape.type) {
          case "box":
            switch (path) {
              case "shape.settings.size":
                const geometry = rendererNode.shape.geometry = new THREE.BoxGeometry(value.x, value.y, value.z);
                this.cubicModelRenderer.updateBoxNodeUv(geometry, node);
                break;

              case "shape.settings.stretch":
                rendererNode.shape.scale.set(value.x, value.y, value.z);
                rendererNode.shape.updateMatrixWorld(false);
                break;
            }
            break;
        }
        break;
      }
    }
  }

  _onEditCommand_duplicateNode(rootNode: Node, newNodes: DuplicatedNode[]) {
    for (const newNode of newNodes) this._createRendererNode(newNode.node);
  }

  _onEditCommand_removeNode(id: string) {
    this._recurseClearNode(id);
  }

  _recurseClearNode(nodeId: string) {
    const rendererNode = this.cubicModelRenderer.byNodeId[nodeId];
    for (const childNode of rendererNode.children) this._recurseClearNode(childNode.nodeId);

    const parentPivot = rendererNode.pivot.parent;
    const parentNodeId = parentPivot.userData.cubicNodeId as string;
    if (parentNodeId != null) {
      const parentRendererNode = this.cubicModelRenderer.byNodeId[parentNodeId];
      parentRendererNode.children.splice(parentRendererNode.children.indexOf(rendererNode), 1);
    }

    rendererNode.shape.parent.remove(rendererNode.shape);
    rendererNode.shape.geometry.dispose();
    rendererNode.shape.material.dispose();

    rendererNode.pivot.parent.remove(rendererNode.pivot);

    delete this.cubicModelRenderer.byNodeId[nodeId];
  }

  _onEditCommand_moveNodeTextureOffset(nodeIds: string[], offset: { x: number; y: number }) {
    for (const id of nodeIds) {
      const node = this.cubicModelAsset.nodes.byId[id];
      const geometry = this.cubicModelRenderer.byNodeId[id].shape.geometry as THREE.Geometry;
      this.cubicModelRenderer.updateBoxNodeUv(geometry, node);
    }
  }

  _onEditCommand_changeTextureWidth() { this._onChangeTextureSize(); }
  _onEditCommand_changeTextureHeight() { this._onChangeTextureSize(); }

  _onChangeTextureSize() {
    for (const id in this.cubicModelAsset.nodes.byId) {
      const node = this.cubicModelAsset.nodes.byId[id];
      const shape = this.cubicModelRenderer.byNodeId[id].shape;
      this.cubicModelRenderer.updateBoxNodeUv(shape.geometry as THREE.Geometry, node);

      const material = shape.material as THREE.MeshBasicMaterial;
      material.map = this.cubicModelAsset.pub.textures["map"];
      material.needsUpdate = true;
    }
  }

  _onCubicModelAssetTrashed() {
    this.cubicModelAsset = null;
    this.cubicModelRenderer.setCubicModel(null);
    // FIXME: the updater shouldn't be dealing with SupClient.onAssetTrashed directly
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "cubicModelAssetId":
        if (this.cubicModelAssetId != null) this.client.unsubAsset(this.cubicModelAssetId, this.cubicModelSubscriber);
        this.cubicModelAssetId = value;

        this.cubicModelAsset = null;
        this.cubicModelRenderer.setCubicModel(null, null);

        if (this.cubicModelAssetId != null) this.client.subAsset(this.cubicModelAssetId, "cubicModel", this.cubicModelSubscriber);
        break;
    }
  }
}
