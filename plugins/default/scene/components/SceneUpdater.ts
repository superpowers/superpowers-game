import SceneAsset, { DuplicatedNode } from "../data/SceneAsset";
import { Node } from "../data/SceneNodes";
import { Component } from "../data/SceneComponents";

const tmpVector3 = new SupEngine.THREE.Vector3();
const tmpQuaternion = new SupEngine.THREE.Quaternion();

interface SceneUpdaterConfig {
  sceneAssetId: string;
  isInPrefab: boolean;
}

export default class SceneUpdater {
  gameInstance: SupEngine.GameInstance;
  rootActor: SupEngine.Actor;
  sceneAssetId: string;
  sceneAsset: SceneAsset;
  isInPrefab: boolean;

  bySceneNodeId: { [id: string]: {
    actor: SupEngine.Actor;
    markerActor: SupEngine.Actor;
    bySceneComponentId: { [id: string]: { component: any; componentUpdater: any } };
    prefabUpdater: SceneUpdater;
  } } = {};

  sceneSubscriber: SupClient.AssetSubscriber;

  constructor(private client: SupClient.ProjectClient, engine: { gameInstance: SupEngine.GameInstance; actor: SupEngine.Actor; }, config: SceneUpdaterConfig,
  private externalSubscriber?: SupClient.AssetSubscriber) {
    this.gameInstance = engine.gameInstance;
    this.rootActor = engine.actor;
    this.sceneAssetId = config.sceneAssetId;
    this.isInPrefab = config.isInPrefab;

    if (this.externalSubscriber == null) this.externalSubscriber = {};

    this.sceneSubscriber = {
      onAssetReceived: this.onSceneAssetReceived,
      onAssetEdited: this.onSceneAssetEdited,
      onAssetTrashed: this.onSceneAssetTrashed
    };
    if (this.sceneAssetId != null) this.client.subAsset(this.sceneAssetId, "scene", this.sceneSubscriber);
  }

  destroy() {
    this.clearScene();
    if (this.sceneAssetId != null) this.client.unsubAsset(this.sceneAssetId, this.sceneSubscriber);
  }

  private onSceneAssetReceived = (assetId: string, asset: SceneAsset) => {
    this.sceneAsset = asset;

    const walk = (node: Node) => {
      this.createNodeActor(node);

      if (node.children != null && node.children.length > 0) {
        for (const child of node.children) walk(child);
      }
    };
    for (const node of asset.nodes.pub) walk(node);

    if (this.externalSubscriber.onAssetReceived != null) this.externalSubscriber.onAssetReceived(assetId, asset);
  };

  private onSceneAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    const commandFunction = this.onEditCommands[command];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.externalSubscriber.onAssetEdited != null) this.externalSubscriber.onAssetEdited(assetId, command, ...args);
  };

  private onEditCommands: { [command: string]: Function; } = {
    addNode: (node: Node, parentId: string, index: number) => {
      this.createNodeActor(node);
    },

    moveNode: (id: string, parentId: string, index: number) => {
      const nodeActor = this.bySceneNodeId[id].actor;
      const parentNodeActor = (this.bySceneNodeId[parentId] != null) ? this.bySceneNodeId[parentId].actor : null;
      nodeActor.setParent(parentNodeActor);
      this.onUpdateMarkerRecursive(id);
    },

    setNodeProperty: (id: string, path: string, value: any) => {
      const nodeEditorData = this.bySceneNodeId[id];

      switch (path) {
        case "position":
          nodeEditorData.actor.setLocalPosition(value);
          if (!this.isInPrefab) this.onUpdateMarkerRecursive(id);
          break;
        case "orientation":
          nodeEditorData.actor.setLocalOrientation(value);
          if (!this.isInPrefab) this.onUpdateMarkerRecursive(id);
          break;
        case "scale":
          nodeEditorData.actor.setLocalScale(value);
          if (!this.isInPrefab) this.onUpdateMarkerRecursive(id);
          break;
        case "prefab.sceneAssetId":
          nodeEditorData.prefabUpdater.config_setProperty("sceneAssetId", value);
          break;
      }
    },

    duplicateNode: (rootNode: Node, newNodes: DuplicatedNode[]) => {
      for (const newNode of newNodes) this.createNodeActor(newNode.node);
    },

    removeNode: (id: string) => {
      this.recurseClearActor(id);
    },

    addComponent(nodeComponent: Component, nodeId: string, index: number) {
      this.createNodeActorComponent(this.sceneAsset.nodes.byId[nodeId], nodeComponent, this.bySceneNodeId[nodeId].actor);
    },

    editComponent(nodeId: string, componentId: string, command: string, ...args: any[]) {
      const componentUpdater = this.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater;
      if (componentUpdater[`config_${command}`] != null) componentUpdater[`config_${command}`].apply(componentUpdater, args);
    },

    removeComponent(nodeId: string, componentId: string) {
      this.gameInstance.destroyComponent(this.bySceneNodeId[nodeId].bySceneComponentId[componentId].component);

      this.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater.destroy();
      delete this.bySceneNodeId[nodeId].bySceneComponentId[componentId];
    }
  };

  private onUpdateMarkerRecursive(nodeId: string) {
    this.sceneAsset.nodes.walkNode(this.sceneAsset.nodes.byId[nodeId], null, (descendantNode) => {
      const nodeEditorData = this.bySceneNodeId[descendantNode.id];
      nodeEditorData.markerActor.setGlobalPosition(nodeEditorData.actor.getGlobalPosition(tmpVector3));
      nodeEditorData.markerActor.setGlobalOrientation(nodeEditorData.actor.getGlobalOrientation(tmpQuaternion));
    });
  }

  private recurseClearActor(nodeId: string) {
    const nodeEditorData = this.bySceneNodeId[nodeId];

    if (nodeEditorData.prefabUpdater == null) {
      for (const childActor of nodeEditorData.actor.children) {
        const sceneNodeId = (<any>childActor).sceneNodeId;
        if (sceneNodeId != null) this.recurseClearActor(sceneNodeId);
      }
    } else {
      nodeEditorData.prefabUpdater.destroy();
    }

    for (const componentId in nodeEditorData.bySceneComponentId) {
      nodeEditorData.bySceneComponentId[componentId].componentUpdater.destroy();
    }

    if (!this.isInPrefab) this.gameInstance.destroyActor(nodeEditorData.markerActor);
    this.gameInstance.destroyActor(nodeEditorData.actor);
    delete this.bySceneNodeId[nodeId];
  }

  private onSceneAssetTrashed = (assetId: string) => {
    this.clearScene();

    if (this.sceneSubscriber.onAssetTrashed != null) this.sceneSubscriber.onAssetTrashed(assetId);
  };

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "sceneAssetId":
        if (this.sceneAssetId != null) this.client.unsubAsset(this.sceneAssetId, this.sceneSubscriber);
        this.sceneAssetId = value;

        this.clearScene();
        this.sceneAsset = null;

        if (this.sceneAssetId != null) this.client.subAsset(this.sceneAssetId, "scene", this.sceneSubscriber);
        break;
    }
  }

  private createNodeActor(node: Node) {
    const parentNode = this.sceneAsset.nodes.parentNodesById[node.id];
    let parentActor: SupEngine.Actor;
    if (parentNode != null) parentActor = this.bySceneNodeId[parentNode.id].actor;
    else parentActor = this.rootActor;

    const nodeActor = new SupEngine.Actor(this.gameInstance, node.name, parentActor);
    const nodeId = (this.rootActor == null) ? node.id : this.rootActor.threeObject.userData.nodeId;
    nodeActor.threeObject.userData.nodeId = nodeId;
    nodeActor.threeObject.position.copy(<THREE.Vector3>node.position);
    nodeActor.threeObject.quaternion.copy(<THREE.Quaternion>node.orientation);
    nodeActor.threeObject.scale.copy(<THREE.Vector3>node.scale);
    nodeActor.threeObject.updateMatrixWorld(false);
    (<any>nodeActor).sceneNodeId = node.id;

    let markerActor: SupEngine.Actor;
    if (!this.isInPrefab) {
      markerActor = new SupEngine.Actor(this.gameInstance, `${nodeId} Marker`, null, { layer: -1 });
      markerActor.setGlobalPosition(nodeActor.getGlobalPosition(tmpVector3));
      markerActor.setGlobalOrientation(nodeActor.getGlobalOrientation(tmpQuaternion));
      new SupEngine.editorComponentClasses["TransformMarker"](markerActor);
    }

    this.bySceneNodeId[node.id] = { actor: nodeActor, markerActor, bySceneComponentId: {}, prefabUpdater: null };
    if (node.prefab != null) {
      this.bySceneNodeId[node.id].prefabUpdater = new SceneUpdater(this.client,
        { gameInstance: this.gameInstance, actor: nodeActor }, { sceneAssetId: node.prefab.sceneAssetId, isInPrefab: true });
    }

    if (node.components != null) for (const component of node.components) this.createNodeActorComponent(node, component, nodeActor);
    return nodeActor;
  }

  private createNodeActorComponent(sceneNode: Node, sceneComponent: Component, nodeActor: SupEngine.Actor) {
    let componentClass = SupEngine.editorComponentClasses[`${sceneComponent.type}Marker`];
    if (componentClass == null) componentClass = SupEngine.componentClasses[sceneComponent.type];
    const actorComponent = new componentClass(nodeActor);

    this.bySceneNodeId[sceneNode.id].bySceneComponentId[sceneComponent.id] = {
      component: actorComponent,
      componentUpdater: new componentClass.Updater(this.client, actorComponent, sceneComponent.config),
    };
  }

  private clearScene() {
    for (const sceneNodeId in this.bySceneNodeId) {
      const sceneNode = this.bySceneNodeId[sceneNodeId];

      if (!this.isInPrefab) this.gameInstance.destroyActor(sceneNode.markerActor);

      for (const componentId in sceneNode.bySceneComponentId) sceneNode.bySceneComponentId[componentId].componentUpdater.destroy();
      this.gameInstance.destroyActor(sceneNode.actor);
    }
    this.bySceneNodeId = {};
  }
}
