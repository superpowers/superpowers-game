import info from "./info";
import ui, { setCameraMode, createNodeElement, onNodeSelect, createComponentElement, setInspectorPosition, setInspectorOrientation, setInspectorScale } from "./ui";
import engine, { createNodeActor, createNodeActorComponent } from "./engine";

let THREE = SupEngine.THREE;
import SceneAsset, { DuplicatedNode } from "../../data/SceneAsset";
import SceneSettingsResource from "../../data/SceneSettingsResource";
import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";

export let data: { projectClient: SupClient.ProjectClient, asset?: SceneAsset };

export let socket: SocketIOClient.Socket;
export function networkStart() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
}

function onConnected() {
  data = { projectClient: new SupClient.ProjectClient(socket, { subEntries: true }) };

  data.projectClient.subResource("sceneSettings", sceneSettingSubscriber);
}

var sceneSettingSubscriber = {
  onResourceReceived: (resourceId: string, resource: SceneSettingsResource) => {
    setCameraMode(resource.pub.defaultCameraMode);
    data.projectClient.subAsset(info.assetId, "scene", sceneSubscriber);
  },

  onResourceEdited: (resourceId: string, command: string, propertyName: string) => {}
}

var sceneSubscriber = {
  onAssetReceived: (err: string, asset: SceneAsset) => {
    data.asset = asset;

    // Clear tree view
    ui.nodesTreeView.clearSelection()
    ui.nodesTreeView.treeRoot.innerHTML = ""

    // TODO: Clear existing actors

    function walk(node: Node, parentNode: Node, parentElt: HTMLLIElement) {
      let liElt = createNodeElement(node);
      ui.nodesTreeView.append(liElt, "group", parentElt);

      createNodeActor(node);

      if (node.children != null && node.children.length > 0) {
        liElt.classList.add("collapsed");
        for (let child of node.children) walk(child, node, liElt)
      }
    }
    for (let node of data.asset.nodes.pub) walk(node, null, null);
  },

  onAssetEdited: (id: string, command: string, ...args: any[]) => {
    if (onEditCommands[command] != null) onEditCommands[command].apply(data.asset, args);
  },

  onAssetTrashed: (id: string) => { SupClient.onAssetTrashed(); }
}
var onEditCommands: any = {};
onEditCommands.addNode = (node: Node, parentId: string, index: number) => {
  let nodeElt = createNodeElement(node);
  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);

  createNodeActor(node);
}

onEditCommands.moveNode = (id: string, parentId: string, index: number) => {
  // Reparent tree node
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];

  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`)
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);

  // Update actor
  let nodeActor = engine.bySceneNodeId[id].actor;
  let parentNodeActor = (engine.bySceneNodeId[parentId] != null) ? engine.bySceneNodeId[parentId].actor : null;
  nodeActor.setParent(parentNodeActor);

  // Update data.asset.nodes with new local transform
  let node = data.asset.nodes.byId[id];
  node.position = {
    x: nodeActor.threeObject.position.x,
    y: nodeActor.threeObject.position.y,
    z: nodeActor.threeObject.position.z,
  };

  node.orientation = {
    x: nodeActor.threeObject.quaternion.x,
    y: nodeActor.threeObject.quaternion.y,
    z: nodeActor.threeObject.quaternion.z,
    w: nodeActor.threeObject.quaternion.w,
  };

  node.scale = {
    x: nodeActor.threeObject.scale.x,
    y: nodeActor.threeObject.scale.y,
    z: nodeActor.threeObject.scale.z,
  };

  // Refresh inspector
  if (isInspected) {
    setInspectorPosition(<THREE.Vector3>node.position);
    setInspectorOrientation(<THREE.Quaternion>node.orientation);
    setInspectorScale(<THREE.Vector3>node.scale);
  }
}

onEditCommands.setNodeProperty = (id: string, path: string, value: any) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];

  switch (path) {
    case "name": { nodeElt.querySelector(".name").textContent = value; break; }
    case "position": {
      if (isInspected) setInspectorPosition(<THREE.Vector3>data.asset.nodes.byId[id].position);
      engine.bySceneNodeId[id].actor.setLocalPosition(value);
      break;
    }
    case "orientation": {
      if (isInspected) setInspectorOrientation(<THREE.Quaternion>data.asset.nodes.byId[id].orientation);
      engine.bySceneNodeId[id].actor.setLocalOrientation(value);
      break;
    }
    case "scale": {
      if (isInspected) setInspectorScale(<THREE.Vector3>data.asset.nodes.byId[id].scale);
      engine.bySceneNodeId[id].actor.setLocalScale(value);
      break;
    }
  }
}

onEditCommands.duplicateNode = (rootNode: Node, newNodes: DuplicatedNode[]) => {
  for (let newNode of newNodes) onEditCommands.addNode(newNode.node, newNode.parentId, newNode.index);
}

onEditCommands.removeNode = (id: string) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];

  ui.nodesTreeView.remove(nodeElt);
  if (isInspected) onNodeSelect();

  let actorToBeDestroyed = engine.bySceneNodeId[id].actor;
  recurseClearActorUIs(id);
  engine.gameInstance.destroyActor(actorToBeDestroyed);
}

function recurseClearActorUIs(nodeId: string) {
  let actor = engine.bySceneNodeId[nodeId].actor;

  for (let childActor of actor.children) {
    let sceneNodeId = (<any>childActor).sceneNodeId;
  	if (sceneNodeId != null) recurseClearActorUIs(sceneNodeId);
  }

  for (let componentId in engine.bySceneNodeId[nodeId].bySceneComponentId) {
    engine.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater.destroy();
  }

  delete engine.bySceneNodeId[nodeId];
}

onEditCommands.addComponent = (nodeId: string, nodeComponent: Component, index: number) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (isInspected) {
    let componentElt = createComponentElement(nodeId, nodeComponent);
    // TODO: Take index into account
    ui.inspectorElt.querySelector(".components").appendChild(componentElt);
  }

  createNodeActorComponent(data.asset.nodes.byId[nodeId], nodeComponent, engine.bySceneNodeId[nodeId].actor);
}

onEditCommands.editComponent = (nodeId: string, componentId: string, command: string, ...args: any[]) => {
  let componentUpdater = engine.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater;
  if (componentUpdater[`config_${command}`] != null) componentUpdater[`config_${command}`].call(componentUpdater, ...args);

  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;
  if (isInspected) {
    let componentEditor = ui.componentEditors[componentId];
    let commandCallback = (<any>componentEditor)[`config_${command}`];
    if (commandCallback != null) commandCallback.call(componentEditor, ...args);
  }
}

onEditCommands.removeComponent = (nodeId: string, componentId: string) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (isInspected) {
    ui.componentEditors[componentId].destroy();
    delete ui.componentEditors[componentId];

    let componentElt = <HTMLDivElement>ui.inspectorElt.querySelector(`.components > div[data-component-id='${componentId}']`);
    componentElt.parentElement.removeChild(componentElt);
  }

  engine.gameInstance.destroyComponent(engine.bySceneNodeId[nodeId].bySceneComponentId[componentId].component);

  engine.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater.destroy();
  delete engine.bySceneNodeId[nodeId].bySceneComponentId[componentId];
}
