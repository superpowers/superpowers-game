import * as path from "path";
import ui, {
  createNodeElement,
  setupSelectedNode,
  setInspectorPosition,
  setInspectorOrientation,
  setInspectorShapeOffset,
  setInspectorBoxSize,
  setInspectorBoxStretch
} from "./ui";
import * as textureArea from "./textureArea";
import engine, { setupHelpers } from "./engine";

import CubicModelRenderer from "../../components/CubicModelRenderer";
import CubicModelRendererUpdater from "../../components/CubicModelRendererUpdater";
import { DuplicatedNode } from "../../data/CubicModelAsset";
import { Node } from "../../data/CubicModelNodes";

export let data: { projectClient?: SupClient.ProjectClient; cubicModelUpdater?: CubicModelRendererUpdater };

export let socket: SocketIOClient.Socket;
SupClient.i18n.load([{ root: path.join(window.location.pathname, "../.."), name: "cubicModelEditor" }], () => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
});

let onEditCommands: any = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  let cubicModelActor = new SupEngine.Actor(engine.gameInstance, "Cubic Model");
  let cubicModelRenderer = new CubicModelRenderer(cubicModelActor);
  let config = { cubicModelAssetId: SupClient.query.asset/*, materialType: "basic"*/ };
  let receiveCallbacks = { cubicModel: onAssetReceived };
  let editCallbacks = { cubicModel: onEditCommands };

  data.cubicModelUpdater = new CubicModelRendererUpdater(data.projectClient, cubicModelRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived() {
  // Clear tree view
  ui.nodesTreeView.clearSelection();
  ui.nodesTreeView.treeRoot.innerHTML = "";

  function walk(node: Node, parentNode: Node, parentElt: HTMLLIElement) {
    let liElt = createNodeElement(node);
    ui.nodesTreeView.append(liElt, "group", parentElt);

    if (node.children != null && node.children.length > 0) {
      liElt.classList.add("collapsed");
      for (let child of node.children) walk(child, node, liElt);
    }
  }
  for (let node of data.cubicModelUpdater.cubicModelAsset.nodes.pub) walk(node, null, null);

  let pub = data.cubicModelUpdater.cubicModelAsset.pub;
  ui.pixelsPerUnitInput.value = pub.pixelsPerUnit.toString();
  ui.textureWidthSelect.value = pub.textureWidth.toString();
  ui.textureHeightSelect.value = pub.textureHeight.toString();

  (document.querySelector("button.new-node") as HTMLInputElement).disabled = false;

  textureArea.setup();
}

export function editAsset(...args: any[]) {
  let callback: Function;
  if (typeof args[args.length - 1] === "function") callback = args.pop();

  args.push((err: string, id: string) => {
    if (err != null) { alert(err); return; }
    if (callback != null) callback(id);
  });
  socket.emit("edit:assets", SupClient.query.asset, ...args);
}

onEditCommands.setProperty = (path: string, value: any) => {
  if (path === "pixelsPerUnit") ui.pixelsPerUnitInput.value = value.toString();
};

onEditCommands.addNode = (node: Node, parentId: string, index: number) => {
  let nodeElt = createNodeElement(node);
  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);

  textureArea.addNode(node);
};

onEditCommands.moveNode = (id: string, parentId: string, index: number) => {
  // Reparent tree node
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];

  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);

  // Refresh inspector
  if (isInspected) {
    let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[id];
    setInspectorPosition(<THREE.Vector3>node.position);
    setInspectorOrientation(<THREE.Quaternion>node.orientation);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.moveNodePivot = (id: string, value: { x: number; y: number; z: number; }) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];
  let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[id];

  if (isInspected) {
    setInspectorPosition(<THREE.Vector3>node.position);
    setInspectorOrientation(<THREE.Quaternion>node.orientation);
    setInspectorShapeOffset(<THREE.Vector3>node.shape.offset);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.setNodeProperty = (id: string, path: string, value: any) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];
  let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[id];

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

    case "shape.offset":
      if (isInspected) setInspectorShapeOffset(<THREE.Vector3>node.shape.offset);
      break;
    case "shape.settings.size":
      if (isInspected) setInspectorBoxSize(<THREE.Vector3>node.shape.settings.size);
      break;
    case "shape.settings.stretch":
      if (isInspected) setInspectorBoxStretch(<THREE.Vector3>node.shape.settings.stretch);
      break;
  }

  textureArea.updateNode(node);

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.duplicateNode = (rootNode: Node, newNodes: DuplicatedNode[]) => {
  for (let newNode of newNodes) onEditCommands.addNode(newNode.node, newNode.parentId, newNode.index);

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.removeNode = (id: string) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];
  ui.nodesTreeView.remove(nodeElt);
  textureArea.updateRemovedNode();

  if (isInspected) setupSelectedNode();

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.moveNodeTextureOffset = (nodeIds: string[], offset: { x: number; y: number }) => {
  for (let id of nodeIds) {
    let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[id];
    textureArea.updateNode(node);
  }
};

onEditCommands.changeTextureWidth = () => {
  ui.textureWidthSelect.value = data.cubicModelUpdater.cubicModelAsset.pub.textureWidth.toString();
  textureArea.setupTexture();
};
onEditCommands.changeTextureHeight = () => {
  ui.textureHeightSelect.value = data.cubicModelUpdater.cubicModelAsset.pub.textureHeight.toString();
  textureArea.setupTexture();
};
