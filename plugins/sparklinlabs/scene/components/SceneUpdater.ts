import SceneComponent from "./SceneComponent";
import SceneAsset, { DuplicatedNode } from "../data/SceneAsset";
import { Node } from "../data/SceneNodes";
import { Component } from "../data/SceneComponents";

import TransformMarker from "./TransformMarker";

export default class SceneUpdater {
  projectClient: SupClient.ProjectClient;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  gameInstance: SupEngine.GameInstance;
  rootActor: SupEngine.Actor;
  sceneAssetId: string;
  sceneAsset: SceneAsset;

  bySceneNodeId: { [id: string]: {
    actor: SupEngine.Actor;
    bySceneComponentId: { [id: string]: { component: any; componentUpdater: any } };
    prefabUpdater: SceneUpdater;
  } } = {};

  sceneSubscriber = {
    onAssetReceived: this._onSceneAssetReceived.bind(this),
    onAssetEdited: this._onSceneAssetEdited.bind(this),
    onAssetTrashed: this._onSceneAssetTrashed.bind(this)
  };

  constructor(projectClient: SupClient.ProjectClient, engine: { gameInstance: SupEngine.GameInstance; actor: SupEngine.Actor; }, config: any,
  receiveAssetCallbacks?: any, editAssetCallbacks?: any) {

    this.projectClient = projectClient;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.gameInstance = engine.gameInstance;
    this.rootActor = engine.actor;
    this.sceneAssetId = config.sceneAssetId;

    if (this.sceneAssetId != null) this.projectClient.subAsset(this.sceneAssetId, "scene", this.sceneSubscriber);
  }

  destroy() {
    this._clearScene();
    if (this.sceneAssetId != null) this.projectClient.unsubAsset(this.sceneAssetId, this.sceneSubscriber);
  }

  _onSceneAssetReceived(assetId: string, asset: SceneAsset) {
    this.sceneAsset = asset;

    let walk = (node: Node) => {
      this._createNodeActor(node);

      if (node.children != null && node.children.length > 0) {
        for (let child of node.children) walk(child);
      }
    }
    for (let node of asset.nodes.pub) walk(node);

    if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.scene();
  }

  _onSceneAssetEdited(id: string, command: string, ...args: any[]) {
    let commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.scene[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onEditCommand_addNode(node: Node, parentId: string, index: number) {
    this._createNodeActor(node);
  }

  _onEditCommand_moveNode = (id: string, parentId: string, index: number) => {
    let nodeActor = this.bySceneNodeId[id].actor;
    let parentNodeActor = (this.bySceneNodeId[parentId] != null) ? this.bySceneNodeId[parentId].actor : null;
    nodeActor.setParent(parentNodeActor);
  }

  _onEditCommand_setNodeProperty = (id: string, path: string, value: any) => {
    switch (path) {
      case "position":
        this.bySceneNodeId[id].actor.setLocalPosition(value);
        break;
      case "orientation":
        this.bySceneNodeId[id].actor.setLocalOrientation(value);
        break;
      case "scale":
        this.bySceneNodeId[id].actor.setLocalScale(value);
        break;
      case "prefabId":
        this.bySceneNodeId[id].prefabUpdater.config_setProperty("prefabId", value);
        break;
    }
  }

  _onEditCommand_duplicateNode = (rootNode: Node, newNodes: DuplicatedNode[]) => {
    for (let newNode of newNodes) this._createNodeActor(newNode.node);
  }

  _onEditCommand_removeNode = (id: string) => {
    let recurseClearActor = (nodeId: string) => {
      let sceneNode = this.bySceneNodeId[nodeId];
      let maybePrefab = sceneNode.bySceneComponentId[0];

      if (maybePrefab != null && maybePrefab.component.typeName !== "Scene") {
        for (let childActor of sceneNode.actor.children) {
          let sceneNodeId = (<any>childActor).sceneNodeId;
          if (sceneNodeId != null) recurseClearActor(sceneNodeId);
        }
      }

      for (let componentId in this.bySceneNodeId[nodeId].bySceneComponentId) {
        this.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater.destroy();
      }

      delete this.bySceneNodeId[nodeId];
    };

    let actorToBeDestroyed = this.bySceneNodeId[id].actor;
    recurseClearActor(id);
    this.gameInstance.destroyActor(actorToBeDestroyed);
  }

  _onEditCommand_addComponent = (nodeId: string, nodeComponent: Component, index: number) => {
    this._createNodeActorComponent(this.sceneAsset.nodes.byId[nodeId], nodeComponent, this.bySceneNodeId[nodeId].actor);
  }

  _onEditCommand_editComponent = (nodeId: string, componentId: string, command: string, ...args: any[]) => {
    let componentUpdater = this.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater;
    if (componentUpdater[`config_${command}`] != null) componentUpdater[`config_${command}`].call(componentUpdater, ...args);
  }

  _onEditCommand_removeComponent = (nodeId: string, componentId: string) => {
    this.gameInstance.destroyComponent(this.bySceneNodeId[nodeId].bySceneComponentId[componentId].component);

    this.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater.destroy();
    delete this.bySceneNodeId[nodeId].bySceneComponentId[componentId];
  }

  _onSceneAssetTrashed() {
    this._clearScene();
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "prefabId":
        if (this.sceneAssetId != null) this.projectClient.unsubAsset(this.sceneAssetId, this.sceneSubscriber);
        this.sceneAssetId = value;

        this._clearScene();
        this.sceneAsset = null;

        if (this.sceneAssetId != null) this.projectClient.subAsset(this.sceneAssetId, "scene", this.sceneSubscriber);
        break;
    }
  }

  _createNodeActor(node: Node) {
    let parentNode = this.sceneAsset.nodes.parentNodesById[node.id];
    let parentActor: SupEngine.Actor;
    if (parentNode != null) parentActor = this.bySceneNodeId[parentNode.id].actor;
    else parentActor = this.rootActor;

    let nodeActor = new SupEngine.Actor(this.gameInstance, node.name, parentActor);
    let nodeId = (this.rootActor == null) ? node.id : this.rootActor.threeObject.userData.nodeId;
    nodeActor.threeObject.userData.nodeId = nodeId;
    nodeActor.threeObject.position.copy(<THREE.Vector3>node.position);
    nodeActor.threeObject.quaternion.copy(<THREE.Quaternion>node.orientation);
    nodeActor.threeObject.scale.copy(<THREE.Vector3>node.scale);
    nodeActor.threeObject.updateMatrixWorld(false);
    (<any>nodeActor).sceneNodeId = node.id;
    new TransformMarker(nodeActor);

    this.bySceneNodeId[node.id] = { actor: nodeActor, bySceneComponentId: {}, prefabUpdater: null };
    if (node.prefabId != null)
      this.bySceneNodeId[node.id].prefabUpdater = new SceneUpdater(this.projectClient,
        { gameInstance: this.gameInstance, actor: nodeActor }, { sceneAssetId: node.prefabId });

    if (node.components != null) for (let component of node.components) this._createNodeActorComponent(node, component, nodeActor);
    return nodeActor;
  }

  _createNodeActorComponent(sceneNode: Node, sceneComponent: Component, nodeActor: SupEngine.Actor) {
    let componentClass = SupEngine.editorComponentClasses[`${sceneComponent.type}Marker`];
    if (componentClass == null) componentClass = SupEngine.componentClasses[sceneComponent.type];
    let actorComponent = new componentClass(nodeActor);

    this.bySceneNodeId[sceneNode.id].bySceneComponentId[sceneComponent.id] = {
      component: actorComponent,
      componentUpdater: new componentClass.Updater(this.projectClient, actorComponent, sceneComponent.config),
    };
  }

  _clearScene() {
    for (let sceneNodeId in this.bySceneNodeId) {
      let sceneNode = this.bySceneNodeId[sceneNodeId];
      for (let componentId in sceneNode.bySceneComponentId) sceneNode.bySceneComponentId[componentId].componentUpdater.destroy();
      this.gameInstance.destroyActor(sceneNode.actor);
    }
    this.bySceneNodeId = {};
  }
}
