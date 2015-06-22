import info from "./info";
import { socket, data } from "./network";
import engine, { setupHelpers } from "./engine";

import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";

let THREE = SupEngine.THREE;
let TreeView = require("dnd-tree-view");
let PerfectResize = require("perfect-resize");

let ui: {
  nodesTreeView?: any;

  newNodeButton?: HTMLButtonElement;
  newPrefabButton?: HTMLButtonElement;
  renameNodeButton?: HTMLButtonElement;
  duplicateNodeButton?: HTMLButtonElement;
  deleteNodeButton?: HTMLButtonElement;

  inspectorElt?: HTMLDivElement;
  inspectorTbodyElt?: HTMLTableElement;

  transform?: {
    positionElts: HTMLInputElement[];
    orientationElts: HTMLInputElement[];
    scaleElts: HTMLInputElement[];
  };

  visibleCheckbox?: HTMLInputElement;
  layerSelect?: HTMLSelectElement;
  prefabRow?: HTMLTableRowElement;
  prefabInput?: HTMLInputElement;

  availableComponents?: { [name: string]: string };
  componentEditors?: { [id: string]: SupClient.ComponentEditorObject };
  newComponentButton?: HTMLButtonElement;

  cameraMode?: string;
  cameraModeButton?: HTMLButtonElement;
  cameraSpeedSlider?: HTMLInputElement;
} = {};
export default ui;

SupClient.setupHotkeys();

// Setup resizable panes
new PerfectResize(document.querySelector(".sidebar"), "right");
new PerfectResize(document.querySelector(".nodes-tree-view"), "top");

// Setup tree view
ui.nodesTreeView = new TreeView(document.querySelector(".nodes-tree-view"), onNodeDrop);
ui.nodesTreeView.on("activate", onNodeActivate);
ui.nodesTreeView.on("selectionChange", () => { setupSelectedNode(); });

ui.newNodeButton = <HTMLButtonElement>document.querySelector("button.new-node");
ui.newNodeButton.addEventListener("click", onNewNodeClick);
ui.newPrefabButton = <HTMLButtonElement>document.querySelector("button.new-prefab");
ui.newPrefabButton.addEventListener("click", onNewPrefabClick);
ui.renameNodeButton = <HTMLButtonElement>document.querySelector("button.rename-node");
ui.renameNodeButton.addEventListener("click", onRenameNodeClick);
ui.duplicateNodeButton = <HTMLButtonElement>document.querySelector("button.duplicate-node");
ui.duplicateNodeButton.addEventListener("click", onDuplicateNodeClick);
ui.deleteNodeButton = <HTMLButtonElement>document.querySelector("button.delete-node");
ui.deleteNodeButton.addEventListener("click", onDeleteNodeClick);

// Inspector
ui.inspectorElt = <HTMLDivElement>document.querySelector(".inspector");
ui.inspectorTbodyElt = <HTMLTableElement>ui.inspectorElt.querySelector("tbody");

ui.transform = {
  positionElts: <any>ui.inspectorElt.querySelectorAll(".transform .position input"),
  orientationElts: <any>ui.inspectorElt.querySelectorAll(".transform .orientation input"),
  scaleElts: <any>ui.inspectorElt.querySelectorAll(".transform .scale input"),
};

ui.visibleCheckbox = <HTMLInputElement>ui.inspectorElt.querySelector(".visible input");
ui.visibleCheckbox.addEventListener("change", onVisibleChange);

ui.layerSelect = <HTMLSelectElement>ui.inspectorElt.querySelector(".layer select");
ui.layerSelect.addEventListener("change", onLayerChange);

ui.prefabRow = <HTMLTableRowElement>ui.inspectorElt.querySelector(".prefab");
ui.prefabInput = <HTMLInputElement>ui.inspectorElt.querySelector(".prefab input");
ui.prefabInput.addEventListener("input", onPrefabInput);

for (let transformType in ui.transform) {
  let inputs: HTMLInputElement[] = (<any>ui).transform[transformType];
  for (let input of inputs) input.addEventListener("change", onTransformInputChange);
}

ui.newComponentButton = <HTMLButtonElement>document.querySelector("button.new-component");
ui.newComponentButton.addEventListener("click", onNewComponentClick);

ui.cameraMode = "3D";
ui.cameraModeButton = <HTMLButtonElement>document.getElementById("toggle-camera-button");
ui.cameraModeButton.addEventListener("click", onChangeCameraMode);
ui.cameraSpeedSlider = <HTMLInputElement>document.getElementById("camera-speed-slider");
ui.cameraSpeedSlider.addEventListener("input", onChangeCameraSpeed);
ui.cameraSpeedSlider.value = engine.cameraControls.movementSpeed;

ui.availableComponents = {};
export function uiStart() {
  for (let componentName in SupClient.componentEditorClasses) ui.availableComponents[componentName] = componentName;
}

export function createNodeElement(node: Node) {
  let liElt = document.createElement("li");
  (<any>liElt.dataset).id = node.id;

  let nameSpan = document.createElement("span");
  nameSpan.classList.add("name");
  if (node.prefabId != null) nameSpan.classList.add("prefab");
  nameSpan.textContent = node.name;
  liElt.appendChild(nameSpan);

  let visibleButton = document.createElement("button");
  visibleButton.textContent = "Hide";
  visibleButton.classList.add("show");
  visibleButton.addEventListener("click", (event: any) => {
    event.stopPropagation();
    let actor = data.sceneUpdater.bySceneNodeId[event.target.parentElement.dataset["id"]].actor;
    actor.threeObject.visible = !actor.threeObject.visible;
    visibleButton.textContent = (actor.threeObject.visible) ? "Hide" : "Show";
    if (actor.threeObject.visible) visibleButton.classList.add("show");
    else visibleButton.classList.remove("show");
  });
  liElt.appendChild(visibleButton);

  return liElt;
}

function onNodeDrop(dropInfo: any, orderedNodes: any) {
  let dropPoint = SupClient.getTreeViewDropPoint(dropInfo, data.sceneUpdater.sceneAsset.nodes);

  let nodeIds: string[] = [];
  for (let node of orderedNodes ) nodeIds.push(node.dataset.id);

  let sourceParentNode = data.sceneUpdater.sceneAsset.nodes.parentNodesById[nodeIds[0]];
  let sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : data.sceneUpdater.sceneAsset.nodes.pub;
  let sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (let id of nodeIds) {
    socket.emit("edit:assets", info.assetId, "moveNode", id, dropPoint.parentId, dropPoint.index + i, (err: string) => { if (err != null) alert(err); });
    if (! sameParent || sourceChildren.indexOf(data.sceneUpdater.sceneAsset.nodes.byId[id]) >= dropPoint.index) i++;
  }
  return false
}

function onNodeActivate() { ui.nodesTreeView.selectedNodes[0].classList.toggle("collapsed"); }

export function setupSelectedNode() {
  setupHelpers();

  // Clear component editors
  for (let componentId in ui.componentEditors) ui.componentEditors[componentId].destroy();
  ui.componentEditors = {};

  // Setup transform
  let nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt == null || ui.nodesTreeView.selectedNodes.length !== 1) {
    ui.inspectorElt.classList.add("noSelection");

    ui.newNodeButton.disabled = false;
    ui.newPrefabButton.disabled = false;
    ui.renameNodeButton.disabled = true;
    ui.duplicateNodeButton.disabled = true;
    ui.deleteNodeButton.disabled = true;
    return;
  }

  ui.inspectorElt.classList.remove("noSelection");

  let node = data.sceneUpdater.sceneAsset.nodes.byId[nodeElt.dataset.id];
  setInspectorPosition(<THREE.Vector3>node.position);
  setInspectorOrientation(<THREE.Quaternion>node.orientation);
  setInspectorScale(<THREE.Vector3>node.scale);

  ui.visibleCheckbox.checked = node.visible;
  ui.layerSelect.value = <any>node.layer;

  // If it's a prefab, disable various buttons
  let isPrefab = node.prefabId != null;
  ui.newNodeButton.disabled = isPrefab;
  ui.newPrefabButton.disabled = isPrefab;
  ui.renameNodeButton.disabled = false;
  ui.duplicateNodeButton.disabled = false;
  ui.deleteNodeButton.disabled = false;

  if (isPrefab) {
    if (ui.prefabRow.parentElement == null) ui.inspectorTbodyElt.appendChild(ui.prefabRow);
    setInspectorPrefabId(node.prefabId);
  } else if (ui.prefabRow.parentElement != null) ui.inspectorTbodyElt.removeChild(ui.prefabRow);

  // Setup component editors
  let componentsElt = <HTMLDivElement>ui.inspectorElt.querySelector(".components");
  componentsElt.innerHTML = "";

  for (let component of node.components) {
    let componentElt = createComponentElement(node.id, component);
    ui.inspectorElt.querySelector(".components").appendChild(componentElt);
  }
  ui.newComponentButton.disabled = isPrefab;
}

function roundForInspector(number: number) { return parseFloat(number.toFixed(3)); }

export function setInspectorPosition(position: THREE.Vector3) {
  let values = [
    roundForInspector(position.x).toString(),
    roundForInspector(position.y).toString(),
    roundForInspector(position.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.transform.positionElts[i].value !== values[i]) {
      ui.transform.positionElts[i].value = values[i];
    }
  }
}

export function setInspectorOrientation(orientation: THREE.Quaternion) {
  let euler = new THREE.Euler().setFromQuaternion(orientation);

  let values = [
    roundForInspector(THREE.Math.radToDeg(euler.x)).toString(),
    roundForInspector(THREE.Math.radToDeg(euler.y)).toString(),
    roundForInspector(THREE.Math.radToDeg(euler.z)).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.transform.orientationElts[i].value !== values[i]) {
      ui.transform.orientationElts[i].value = values[i];
    }
  }
}

export function setInspectorScale(scale: THREE.Vector3) {
  let values = [
    roundForInspector(scale.x).toString(),
    roundForInspector(scale.y).toString(),
    roundForInspector(scale.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.transform.scaleElts[i].value !== values[i]) {
      ui.transform.scaleElts[i].value = values[i];
    }
  }
}

export function setInspectorVisible(visible: boolean) {
  ui.visibleCheckbox.checked = visible;
}

export function setInspectorLayer(layer: number) {
  ui.layerSelect.value = <any>layer;
}

export function setupInspectorLayers() {
  while (ui.layerSelect.childElementCount > data.gameSettingsResource.pub.customLayers.length + 1) ui.layerSelect.removeChild(ui.layerSelect.lastElementChild);

  let optionElt = <HTMLOptionElement>ui.layerSelect.firstElementChild.nextElementSibling;
  for (let i = 0; i < data.gameSettingsResource.pub.customLayers.length; i++) {
    if (optionElt == null) {
      optionElt = document.createElement("option");
      ui.layerSelect.appendChild(optionElt);
    }
    optionElt.value = (i + 1).toString(); // + 1 because "Default" is 0
    optionElt.textContent = data.gameSettingsResource.pub.customLayers[i];

    optionElt = <HTMLOptionElement>optionElt.nextElementSibling;
  }
}

export function setInspectorPrefabId(prefabId: string) {
  ui.prefabInput.value = prefabId.length === 0 ? "" : data.projectClient.entries.getPathFromId(prefabId);
}

function onNewNodeClick() {
  SupClient.dialogs.prompt("Enter a name for the actor.", null, "Actor", "Create", (name) => {
    if (name == null) return;
    queryNewNode(name, false);
  });
}

function onNewPrefabClick() {
  SupClient.dialogs.prompt("Enter a name for the prefab.", null, "Prefab", "Create", (name) => {
    if (name == null) return;
    queryNewNode(name, true);
  });
}

function queryNewNode(name: string, prefab: boolean) {
  let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

  let offset = new THREE.Vector3(0, 0, -5).applyQuaternion(engine.cameraActor.getGlobalOrientation());
  let position = engine.cameraActor.getGlobalPosition().add(offset);
  if (options.parentId != null) {
    let parentMatrix = data.sceneUpdater.bySceneNodeId[options.parentId].actor.getGlobalMatrix();
    position.applyMatrix4(parentMatrix.getInverse(parentMatrix));
  }
  (<any>options).transform = { position };
  (<any>options).prefab = prefab;

  socket.emit("edit:assets", info.assetId, "addNode", name, options, (err: string, nodeId: string) => {
    if (err != null) { alert(err); return; }

    ui.nodesTreeView.clearSelection();
    ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`));
    setupSelectedNode();
  });
}

function onRenameNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new name for the actor.", null, node.name, "Rename", (newName) => {
    if (newName == null) return;

    socket.emit("edit:assets", info.assetId, "setNodeProperty", node.id, "name", newName, (err: string) => { if (err != null) alert(err); });
  });
}

function onDuplicateNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a name for the new actor.", null, node.name, "Duplicate", (newName) => {
    if (newName == null) return;
    let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    socket.emit("edit:assets", info.assetId, "duplicateNode", newName, node.id, options.index, (err: string, nodeId: string) => {
      if (err != null) alert(err);

      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`));
      setupSelectedNode();
    });
  });
}

function onDeleteNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length === 0) return;
  SupClient.dialogs.confirm("Are you sure you want to delete the selected actors?", "Delete", (confirm) => {
    if (! confirm) return;

    for (let selectedNode of ui.nodesTreeView.selectedNodes) {
      socket.emit("edit:assets", info.assetId, "removeNode", selectedNode.dataset.id, (err: string) => { if (err != null) alert(err); });
    }
  });
}

function onTransformInputChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let transformType = event.target.parentElement.parentElement.parentElement.className;
  let inputs: HTMLInputElement[] = (<any>ui).transform[`${transformType}Elts`];

  let value = {
    x: parseFloat(inputs[0].value),
    y: parseFloat(inputs[1].value),
    z: parseFloat(inputs[2].value),
  };

  if (transformType === "orientation") {
    let euler = new THREE.Euler(THREE.Math.degToRad(value.x), THREE.Math.degToRad(value.y), THREE.Math.degToRad(value.z));
    let quaternion = new THREE.Quaternion().setFromEuler(euler);
    value = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
  }
  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

  socket.emit("edit:assets", info.assetId, "setNodeProperty", nodeId, transformType, value, (err: string) => { if (err != null) alert(err); });
}

function onVisibleChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
  socket.emit("edit:assets", info.assetId, "setNodeProperty", nodeId, "visible", event.target.checked, (err: string) => { if (err != null) alert(err); });
}

function onLayerChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
  socket.emit("edit:assets", info.assetId, "setNodeProperty", nodeId, "layer", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
}

function onPrefabInput(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (event.target.value === "") {
    socket.emit("edit:assets", info.assetId, "setNodeProperty", nodeId, "prefabId", "", (err: string) => { if (err != null) alert(err); });
  }
  else {
    let entry = SupClient.findEntryByPath(data.projectClient.entries.pub, event.target.value);
    if (entry != null && entry.type === "scene") {
      socket.emit("edit:assets", info.assetId, "setNodeProperty", nodeId, "prefabId", entry.id, (err: string) => { if (err != null) alert(err); });
    }
  }
}

export function createComponentElement(nodeId: string, component: Component) {
  let componentElt = document.createElement("div");
  (<any>componentElt.dataset).componentId = component.id;

  let template = <any>document.getElementById("component-cartridge-template");
  let clone = <any>document.importNode(template.content, true);;

  clone.querySelector(".type").textContent = component.type;
  let table = clone.querySelector(".settings");

  let editConfig = (command: string, ...args: any[]) => {
    let callback = (err: string) => { if (err != null) alert(err); }
    // Override callback if one is given
    let lastArg = args[args.length-1];
    if (typeof lastArg === "function") callback = args.pop();

    socket.emit("edit:assets", info.assetId, "editComponent", nodeId, component.id, command, ...args, callback);
  }
  let componentEditorPlugin = SupClient.componentEditorClasses[component.type];
  ui.componentEditors[component.id] = new componentEditorPlugin(table.querySelector("tbody"), component.config, data.projectClient, editConfig);

  let shrinkButton = clone.querySelector(".shrink-component");
  shrinkButton.addEventListener("click", () => {
    if (table.style.display === "none") {
      table.style.display = "";
      shrinkButton.textContent = "–";
    } else {
      table.style.display = "none";
      shrinkButton.textContent = "+";
    }
  });

  clone.querySelector(".delete-component").addEventListener("click", onDeleteComponentClick);

  componentElt.appendChild(clone);
  return componentElt;
}

function onNewComponentClick() {
  SupClient.dialogs.select("Select the type of component to create.", ui.availableComponents, "Create", (type) => {
    if (type == null) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

    socket.emit("edit:assets", info.assetId, "addComponent", nodeId, type, null, (err: string) => { if (err != null) alert(err); });
  });
}

function onDeleteComponentClick(event: any) {
  SupClient.dialogs.confirm("Are you sure you want to delete this component?", "Delete", (confirm) => {
    if (! confirm) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
    let componentId = event.target.parentElement.parentElement.dataset.componentId;

    socket.emit("edit:assets", info.assetId, "removeComponent", nodeId, componentId, (err: string) => { if (err != null) alert(err); });
  });
}

export function setCameraMode(mode: string) {
  engine.gameInstance.destroyComponent(engine.cameraControls);
  ui.cameraMode = mode;

  (<HTMLDivElement>document.querySelector(".controls .camera-speed")).style.display = ui.cameraMode === "3D" ? "" : "none";

  if (ui.cameraMode === "3D") {
    engine.cameraComponent.setOrthographicMode(false);
    engine.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, engine.cameraComponent);
    engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
  } else {
    engine.cameraActor.setLocalOrientation(new SupEngine.THREE.Quaternion().setFromAxisAngle(new SupEngine.THREE.Vector3(0, 1, 0), 0))
    engine.cameraComponent.setOrthographicMode(true);
    engine.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](engine.cameraActor, engine.cameraComponent, {
      zoomSpeed: 1.5,
      zoomMin: 1,
      zoomMax: 100,
    });
  }

  ui.cameraModeButton.textContent = ui.cameraMode;
}

function onChangeCameraMode(event: any) {
  setCameraMode(ui.cameraMode === "3D" ? "2D" : "3D");
}

function onChangeCameraSpeed() {
  engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
}
