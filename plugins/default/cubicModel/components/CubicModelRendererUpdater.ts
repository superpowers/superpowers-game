import CubicModelAsset, { DuplicatedNode } from "../data/CubicModelAsset";
import { Node } from "../data/CubicModelNodes";
import CubicModelRenderer, { RendererNode } from "./CubicModelRenderer";
let THREE = SupEngine.THREE;

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
      let editCallback = this.editAssetCallbacks.cubicModel[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onEditCommand_setProperty(path: string, value: any) {
    switch(path) {
      case "pixelsPerUnit":
        let scale = 1 / value;
        this.cubicModelRenderer.threeRoot.scale.set(scale, scale, scale);
        this.cubicModelRenderer.threeRoot.updateMatrixWorld(false);
        break;
    }
  }

  _onEditCommand_addNode(node: Node, parentId: string, index: number) {
    this._createRendererNode(node);
  }

  _createRendererNode(node: Node) {
    let parentNode = this.cubicModelAsset.nodes.parentNodesById[node.id];
    let parentRendererNode = (parentNode != null) ? this.cubicModelRenderer.byNodeId[parentNode.id] : null;

    let offset = (parentNode != null) ? parentNode.shape.offset : { x: 0, y: 0, z: 0 };
    this.cubicModelRenderer._makeNode(node, parentRendererNode, offset);
  }

  _onEditCommand_moveNode(id: string, parentId: string, index: number) {
    let rendererNode = this.cubicModelRenderer.byNodeId[id];
    let pivot = rendererNode.pivot;
    let matrix = pivot.matrixWorld.clone();

    let previousParentId = pivot.parent.userData.cubicNodeId;
    if (previousParentId != null) {
      let parentNode = this.cubicModelRenderer.byNodeId[previousParentId];
      parentNode.children.splice(parentNode.children.indexOf(rendererNode), 1);
    }

    let parent = (parentId != null) ? this.cubicModelRenderer.byNodeId[parentId].pivot : this.cubicModelRenderer.threeRoot;
    parent.add(pivot);

    matrix.multiplyMatrices(new THREE.Matrix4().getInverse(parent.matrixWorld), matrix);
    matrix.decompose(pivot.position, pivot.quaternion, pivot.scale);
    pivot.updateMatrixWorld(false);
  };

  _onEditCommand_moveNodePivot(id: string, value: { x: number; y: number; z: number; }) {
    let rendererNode = this.cubicModelRenderer.byNodeId[id];
    let node = this.cubicModelAsset.nodes.byId[id];

    let parentNode = this.cubicModelAsset.nodes.parentNodesById[id];
    let parentOffset = (parentNode != null) ? parentNode.shape.offset : { x: 0, y: 0, z: 0 };
    rendererNode.pivot.position.set(value.x + parentOffset.x, value.y + parentOffset.y, value.z + parentOffset.z);
    rendererNode.pivot.quaternion.set(node.orientation.x, node.orientation.y, node.orientation.z, node.orientation.w);
    rendererNode.shape.position.set(node.shape.offset.x, node.shape.offset.y, node.shape.offset.z);

    let walk = (rendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) => {
      let node = this.cubicModelAsset.nodes.byId[rendererNode.nodeId];
      rendererNode.pivot.position.set(node.position.x + parentOffset.x, node.position.y + parentOffset.y, node.position.z + parentOffset.z);

      for (let child of rendererNode.children) walk(child, node.shape.offset);
    };
    for (let child of rendererNode.children) walk(child, node.shape.offset);

    rendererNode.pivot.updateMatrixWorld(false);
  };

  _onEditCommand_setNodeProperty(id: string, path: string, value: any) {
    let rendererNode = this.cubicModelRenderer.byNodeId[id];
    let node = this.cubicModelAsset.nodes.byId[id];

    switch (path) {
      case "name":
        rendererNode.pivot.name = value;
        break;

      case "position":
        let parentNode = this.cubicModelAsset.nodes.parentNodesById[id];
        let parentOffset = (parentNode != null) ? parentNode.shape.offset : { x: 0, y: 0, z: 0 };
        rendererNode.pivot.position.set(value.x + parentOffset.x, value.y + parentOffset.y, value.z + parentOffset.z);
        rendererNode.pivot.updateMatrixWorld(false);
        break;

      case "orientation":
        rendererNode.pivot.quaternion.set(value.x, value.y, value.z, value.w);
        rendererNode.pivot.updateMatrixWorld(false);
        break;

      case "shape.offset":
        rendererNode.shape.position.set(value.x, value.y, value.z);

        let walk = (rendererNode: RendererNode, parentOffset: { x: number; y: number; z: number; }) => {
          let node = this.cubicModelAsset.nodes.byId[rendererNode.nodeId];
          rendererNode.pivot.position.set(node.position.x + parentOffset.x, node.position.y + parentOffset.y, node.position.z + parentOffset.z);

          for (let child of rendererNode.children) walk(child, node.shape.offset);
        };
        for (let child of rendererNode.children) walk(child, node.shape.offset);

        rendererNode.pivot.updateMatrixWorld(false);
        break;

      default: {
        switch (node.shape.type) {
          case "box":
            switch (path) {
              case "shape.settings.size":
                let geometry = rendererNode.shape.geometry = new THREE.BoxGeometry(value.x, value.y, value.z);
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
  };

  _onEditCommand_duplicateNode(rootNode: Node, newNodes: DuplicatedNode[]) {
    for (let newNode of newNodes) this._createRendererNode(newNode.node);
  };

  _onEditCommand_removeNode(id: string) {
    this._recurseClearNode(id);
  };

  _recurseClearNode(nodeId: string) {
    let rendererNode = this.cubicModelRenderer.byNodeId[nodeId];
    for (let childNode of rendererNode.children) this._recurseClearNode(childNode.nodeId);

    let parentPivot = rendererNode.pivot.parent;
    let parentNodeId: string = parentPivot.userData.cubicNodeId;
    if (parentNodeId != null) {
      let parentRendererNode = this.cubicModelRenderer.byNodeId[parentNodeId];
      parentRendererNode.children.splice(parentRendererNode.children.indexOf(rendererNode), 1);
    }

    rendererNode.shape.parent.remove(rendererNode.shape);
    rendererNode.shape.geometry.dispose();
    rendererNode.shape.material.dispose();

    rendererNode.pivot.parent.remove(rendererNode.pivot);

    delete this.cubicModelRenderer.byNodeId[nodeId];
  }

  _onEditCommand_moveNodeTextureOffset(nodeIds: string[], offset: { x: number; y: number }) {
    for (let id of nodeIds) {
      let node = this.cubicModelAsset.nodes.byId[id];
      let geometry = this.cubicModelRenderer.byNodeId[id].shape.geometry as THREE.Geometry;
      this.cubicModelRenderer.updateBoxNodeUv(geometry, node);
    }
  }

  _onEditCommand_changeTextureWidth() { this._onChangeTextureSize(); };
  _onEditCommand_changeTextureHeight() { this._onChangeTextureSize(); };

  _onChangeTextureSize() {
    for (let id in this.cubicModelAsset.nodes.byId) {
      let node = this.cubicModelAsset.nodes.byId[id];
      let shape = this.cubicModelRenderer.byNodeId[id].shape;
      this.cubicModelRenderer.updateBoxNodeUv(shape.geometry as THREE.Geometry, node);

      let material = shape.material as THREE.MeshBasicMaterial;
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
    switch(path) {
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
