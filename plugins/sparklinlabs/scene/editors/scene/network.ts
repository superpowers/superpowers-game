import info from "./info";
import ui, {
  setCameraMode, createNodeElement, setupSelectedNode, createComponentElement,
  setInspectorPosition, setInspectorOrientation, setInspectorScale,
  setInspectorVisible, setInspectorLayer, setInspectorPrefabId,
  setupInspectorLayers } from "./ui";
import engine, { setupHelpers } from "./engine";

let THREE = SupEngine.THREE;
import SceneAsset, { DuplicatedNode } from "../../data/SceneAsset";
import SceneSettingsResource from "../../data/SceneSettingsResource";
import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";
import SceneUpdater from "../../components/SceneUpdater";

export let data: { projectClient: SupClient.ProjectClient, sceneUpdater?: SceneUpdater, gameSettingsResource?: any };

export let socket: SocketIOClient.Socket;
export function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
}

function onConnected() {
  data = { projectClient: new SupClient.ProjectClient(socket, { subEntries: true }) };

  data.projectClient.subResource("sceneSettings", sceneSettingSubscriber);
  data.projectClient.subResource("gameSettings", gameSettingSubscriber);
}

var sceneSettingSubscriber = {
  onResourceReceived: (resourceId: string, resource: SceneSettingsResource) => {
    setCameraMode(resource.pub.defaultCameraMode);
    data.sceneUpdater = new SceneUpdater(
      data.projectClient,
      { gameInstance: engine.gameInstance, actor: null },
      { sceneAssetId: info.assetId},
      { scene: onSceneAssetReceived },
      { scene: onEditCommands }
    );
  },

  onResourceEdited: (resourceId: string, command: string, propertyName: string) => {}
};

var gameSettingSubscriber = {
  onResourceReceived: (resourceId: string, resource: any) => {
    data.gameSettingsResource = resource;
    setupInspectorLayers();
  },

  onResourceEdited: (resourceId: string, command: string, propertyName: string) => {
    if (propertyName == "customLayers") setupInspectorLayers();
  }
};

function onSceneAssetReceived(err: string, asset: SceneAsset) {
  // Clear tree view
  ui.nodesTreeView.clearSelection();
  ui.nodesTreeView.treeRoot.innerHTML = "";

  function walk(node: Node, parentNode: Node, parentElt: HTMLLIElement) {
    let liElt = createNodeElement(node);
    ui.nodesTreeView.append(liElt, "group", parentElt);

    if (node.children != null && node.children.length > 0) {
      liElt.classList.add("collapsed");
      for (let child of node.children) walk(child, node, liElt)
    }
  }
  for (let node of data.sceneUpdater.sceneAsset.nodes.pub) walk(node, null, null);
}

var onEditCommands: any = {};
onEditCommands.addNode = (node: Node, parentId: string, index: number) => {
  let nodeElt = createNodeElement(node);
  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);
}

onEditCommands.moveNode = (id: string, parentId: string, index: number) => {
  // Reparent tree node
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];

  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`)
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);

  // Refresh inspector
  if (isInspected) {
    let node = data.sceneUpdater.sceneAsset.nodes.byId[id];
    setInspectorPosition(<THREE.Vector3>node.position);
    setInspectorOrientation(<THREE.Quaternion>node.orientation);
    setInspectorScale(<THREE.Vector3>node.scale);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
}

onEditCommands.setNodeProperty = (id: string, path: string, value: any) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[id];

  switch (path) {
    case "name":
      nodeElt.querySelector(".name").textContent = value;
      break;
    case "position":
      if (isInspected) setInspectorPosition(<THREE.Vector3>node.position);
      break;
    case "orientation":
      if (isInspected) setInspectorOrientation(<THREE.Quaternion>node.orientation);
      break;
    case "scale":
      if (isInspected) setInspectorScale(<THREE.Vector3>node.scale);
      break;
    case "visible":
      if (isInspected) setInspectorVisible(value);
      break;
    case "layer":
      if (isInspected) setInspectorLayer(value);
      break;
    case "prefabId":
      if (isInspected) setInspectorPrefabId(value);
      break;
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
}

onEditCommands.duplicateNode = (rootNode: Node, newNodes: DuplicatedNode[]) => {
  for (let newNode of newNodes) onEditCommands.addNode(newNode.node, newNode.parentId, newNode.index);

  // TODO: Only refresh if selection is affected
  setupHelpers();
}

onEditCommands.removeNode = (id: string) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];

  ui.nodesTreeView.remove(nodeElt);
  if (isInspected) setupSelectedNode();
  // TODO: Only refresh if selection is affected
  else setupHelpers();
}

onEditCommands.addComponent = (nodeId: string, nodeComponent: Component, index: number) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (isInspected) {
    let componentElt = createComponentElement(nodeId, nodeComponent);
    // TODO: Take index into account
    ui.inspectorElt.querySelector(".components").appendChild(componentElt);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
}

onEditCommands.editComponent = (nodeId: string, componentId: string, command: string, ...args: any[]) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;
  if (isInspected) {
    let componentEditor = ui.componentEditors[componentId];
    let commandCallback = (<any>componentEditor)[`config_${command}`];
    if (commandCallback != null) commandCallback.call(componentEditor, ...args);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
}

onEditCommands.removeComponent = (nodeId: string, componentId: string) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (isInspected) {
    ui.componentEditors[componentId].destroy();
    delete ui.componentEditors[componentId];

    let componentElt = <HTMLDivElement>ui.inspectorElt.querySelector(`.components > div[data-component-id='${componentId}']`);
    componentElt.parentElement.removeChild(componentElt);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
}
