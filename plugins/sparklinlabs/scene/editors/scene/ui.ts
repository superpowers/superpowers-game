import { socket, data } from "./network";
import engine, { setupHelpers, updateCameraMode } from "./engine";

import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";

let THREE = SupEngine.THREE;
/* tslint:disable */
let TreeView = require("dnd-tree-view");
let PerfectResize = require("perfect-resize");
/* tslint:enable */

let ui: {
  canvasElt: HTMLCanvasElement;
  treeViewElt: HTMLDivElement;
  nodesTreeView: any;

  newActorButton: HTMLButtonElement;
  newPrefabButton: HTMLButtonElement;
  renameNodeButton: HTMLButtonElement;
  duplicateNodeButton: HTMLButtonElement;
  deleteNodeButton: HTMLButtonElement;

  inspectorElt: HTMLDivElement;
  inspectorTbodyElt: HTMLTableElement;

  transform: {
    positionElts: HTMLInputElement[];
    orientationElts: HTMLInputElement[];
    scaleElts: HTMLInputElement[];
  };

  visibleCheckbox: HTMLInputElement;
  layerSelect: HTMLSelectElement;
  prefabRow: HTMLTableRowElement;
  prefabInput: HTMLInputElement;
  prefabOpenElt: HTMLButtonElement;

  availableComponents: { [name: string]: string };
  componentEditors: { [id: string]: {
    destroy(): void;
    config_setProperty(path: string, value: any): void;
  } };
  newComponentButton: HTMLButtonElement;

  cameraMode: string;
  cameraModeButton: HTMLButtonElement;
  cameraVerticalAxis: string;
  cameraVerticalAxisButton: HTMLButtonElement;
  cameraSpeedSlider: HTMLInputElement;
  camera2DZ: HTMLInputElement;

  gridCheckbox: HTMLInputElement;
  gridSize: number;
  gridStep: number;
} = <any>{};
export default ui;

// Hotkeys
document.addEventListener("keydown", (event) => {
  if (document.querySelector(".dialog") != null) return;
  let activeElement = <HTMLElement>document.activeElement;
  while (activeElement != null) {
    if (activeElement === ui.canvasElt || activeElement === ui.treeViewElt) break;
    activeElement = activeElement.parentElement;
  }
  if (activeElement == null) return;

  if (event.keyCode === 78 && (event.ctrlKey || event.metaKey)) { // Ctrl+N
    event.preventDefault();
    event.stopPropagation();
    onNewNodeClick();
  }

  if (event.keyCode === 80 && (event.ctrlKey || event.metaKey)) { // Ctrl+P
    event.preventDefault();
    event.stopPropagation();
    onNewPrefabClick();
  }

  if (event.keyCode === 113) { // F2
    event.preventDefault();
    event.stopPropagation();
    onRenameNodeClick();
  }

  if (event.keyCode === 68 && (event.ctrlKey || event.metaKey)) { // Ctrl+D
    event.preventDefault();
    event.stopPropagation();
    onDuplicateNodeClick();
  }

  if (event.keyCode === 46) { // Delete
    event.preventDefault();
    event.stopPropagation();
    onDeleteNodeClick();
  }
});

document.addEventListener("keydown", (event) => {
  if (document.querySelector("body > .dialog") != null) return;
  if ((<HTMLInputElement>event.target).tagName === "INPUT") return;
  if ((<HTMLInputElement>event.target).tagName === "TEXTAREA") return;
  if ((<HTMLInputElement>event.target).tagName === "SELECT") return;
  if ((<HTMLInputElement>event.target).tagName === "BUTTON") return;

  switch (event.keyCode) {
    case (<any>window).KeyEvent.DOM_VK_E:
      (<HTMLInputElement>document.getElementById(`transform-mode-translate`)).checked = true;
      engine.transformHandleComponent.setMode("translate");
      break;
    case (<any>window).KeyEvent.DOM_VK_R:
      (<HTMLInputElement>document.getElementById(`transform-mode-rotate`)).checked = true;
      engine.transformHandleComponent.setMode("rotate");
      break;
    case (<any>window).KeyEvent.DOM_VK_T:
      (<HTMLInputElement>document.getElementById(`transform-mode-scale`)).checked = true;
      engine.transformHandleComponent.setMode("scale");
      break;
    case (<any>window).KeyEvent.DOM_VK_L:
      let localElt = (<HTMLInputElement>document.getElementById(`transform-space`));
      localElt.checked = !localElt.checked;
      engine.transformHandleComponent.setSpace(localElt.checked ? "local" : "world");
      break;

    case (<any>window).KeyEvent.DOM_VK_G:
      ui.gridCheckbox.checked = !ui.gridCheckbox.checked;
      engine.gridHelperComponent.setVisible(ui.gridCheckbox.checked);
      break;

    case (<any>window).KeyEvent.DOM_VK_F:
      if (ui.nodesTreeView.selectedNodes.length !== 1) return;

      let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
      let position = new THREE.Box3().setFromObject(data.sceneUpdater.bySceneNodeId[nodeId].actor.threeObject).center();
      if (ui.cameraMode === "2D") position.z = engine.cameraActor.getLocalPosition(new THREE.Vector3()).z;
      engine.cameraActor.setLocalPosition(position);
      if (ui.cameraMode === "3D") engine.cameraActor.moveOriented(new THREE.Vector3(0, 0, 20));
      break;
  }
});

ui.canvasElt = <HTMLCanvasElement>document.querySelector("canvas");

// Setup resizable panes
new PerfectResize(document.querySelector(".sidebar"), "right");
new PerfectResize(document.querySelector(".nodes-tree-view"), "top");

// Setup tree view
ui.treeViewElt = <HTMLDivElement>document.querySelector(".nodes-tree-view");
ui.nodesTreeView = new TreeView(ui.treeViewElt, { dropCallback: onNodeDrop });
ui.nodesTreeView.on("activate", onNodeActivate);
ui.nodesTreeView.on("selectionChange", () => { setupSelectedNode(); });

ui.newActorButton = <HTMLButtonElement>document.querySelector("button.new-actor");
ui.newActorButton.addEventListener("click", onNewNodeClick);
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

ui.prefabOpenElt = <HTMLButtonElement>ui.inspectorElt.querySelector(".prefab button");
ui.prefabOpenElt.addEventListener("click", (event) => {
  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset.id];
  let id = node.prefab.sceneAssetId;
  window.parent.postMessage({ type: "openEntry", id }, (<any>window.location).origin);
});

for (let transformType in ui.transform) {
  let inputs: HTMLInputElement[] = (<any>ui).transform[transformType];
  for (let input of inputs) input.addEventListener("change", onTransformInputChange);
}

ui.newComponentButton = <HTMLButtonElement>document.querySelector("button.new-component");
ui.newComponentButton.addEventListener("click", onNewComponentClick);

ui.cameraMode = "3D";
ui.cameraModeButton = <HTMLButtonElement>document.getElementById("toggle-camera-button");
ui.cameraModeButton.addEventListener("click", onChangeCameraMode);

ui.cameraVerticalAxis = "Y";
ui.cameraVerticalAxisButton = <HTMLButtonElement>document.getElementById("toggle-camera-vertical-axis");
ui.cameraVerticalAxisButton.addEventListener("click", onChangeCameraVerticalAxis);


ui.cameraSpeedSlider = <HTMLInputElement>document.getElementById("camera-speed-slider");
ui.cameraSpeedSlider.addEventListener("input", onChangeCameraSpeed);
ui.cameraSpeedSlider.value = engine.cameraControls.movementSpeed;

ui.camera2DZ = <HTMLInputElement>document.getElementById("camera-2d-z");
ui.camera2DZ.addEventListener("input", onChangeCamera2DZ);

document.querySelector(".main .controls .transform-mode").addEventListener("click", onTransformModeClick);

ui.availableComponents = {};
export function start() {
  SupClient.setupHotkeys();

  let componentTypes = Object.keys(SupClient.plugins["componentEditors"]);
  componentTypes.sort((a, b) => {
    let componentLabelA = SupClient.i18n.t(`componentEditors:${a}.label`);
    let componentLabelB = SupClient.i18n.t(`componentEditors:${b}.label`);
    return componentLabelA.localeCompare(componentLabelB);
  });
  for (let componentType of componentTypes) ui.availableComponents[componentType] = SupClient.i18n.t(`componentEditors:${componentType}.label`);
}

// Transform
function onTransformModeClick(event: any) {
  if (event.target.tagName !== "INPUT") return;

  if (event.target.id === "transform-space") {
    engine.transformHandleComponent.setSpace(event.target.checked ? "local" : "world");
  } else {
    let transformSpaceCheckbox = <HTMLInputElement>document.getElementById("transform-space");
    transformSpaceCheckbox.disabled = event.target.value === "scale";
    engine.transformHandleComponent.setMode(event.target.value);
  }
}

// Grid
ui.gridCheckbox = <HTMLInputElement>document.getElementById("grid-visible");
ui.gridCheckbox.addEventListener("change", onGridVisibleChange);
ui.gridSize = 80;
ui.gridStep = 1;
document.getElementById("grid-step").addEventListener("input", onGridStepInput);

function onGridStepInput(event: UIEvent) {
  let target = (<HTMLInputElement>event.target);
  let value = parseFloat(target.value);
  if (value !== 0 && value < 0.0001) { value = 0; target.value = "0"; }
  if (isNaN(value) || value <= 0) { (<any>target).reportValidity(); return; }

  ui.gridStep = value;
  engine.gridHelperComponent.setup(ui.gridSize, ui.gridStep);
}

function onGridVisibleChange(event: UIEvent) {
  engine.gridHelperComponent.setVisible((<HTMLInputElement>event.target).checked);
}

// Light
document.getElementById("show-light").addEventListener("change", (event: any) => {
  if (event.target.checked) engine.gameInstance.threeScene.add(engine.ambientLight);
  else engine.gameInstance.threeScene.remove(engine.ambientLight);
});

export function createNodeElement(node: Node) {
  let liElt = document.createElement("li");
  liElt.dataset["id"] = node.id;

  let nameSpan = document.createElement("span");
  nameSpan.classList.add("name");
  if (node.prefab != null) nameSpan.classList.add("prefab");
  nameSpan.textContent = node.name;
  liElt.appendChild(nameSpan);

  let visibleButton = document.createElement("button");
  visibleButton.textContent = SupClient.i18n.t("sceneEditor:treeView.visible.hide");
  visibleButton.classList.add("show");
  visibleButton.addEventListener("click", (event: any) => {
    event.stopPropagation();
    let actor = data.sceneUpdater.bySceneNodeId[event.target.parentElement.dataset["id"]].actor;
    actor.threeObject.visible = !actor.threeObject.visible;
    let visible = actor.threeObject.visible ? "hide" : "show";
    visibleButton.textContent = SupClient.i18n.t(`sceneEditor:treeView.visible.${visible}`);
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
    socket.emit("edit:assets", SupClient.query.asset, "moveNode", id, dropPoint.parentId, dropPoint.index + i, (err: string) => { if (err != null) alert(err); });
    if (!sameParent || sourceChildren.indexOf(data.sceneUpdater.sceneAsset.nodes.byId[id]) >= dropPoint.index) i++;
  }
  return false;
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
    ui.inspectorElt.hidden = true;

    ui.newActorButton.disabled = false;
    ui.newPrefabButton.disabled = false;
    ui.renameNodeButton.disabled = true;
    ui.duplicateNodeButton.disabled = true;
    ui.deleteNodeButton.disabled = true;
    return;
  }

  ui.inspectorElt.hidden = false;

  let node = data.sceneUpdater.sceneAsset.nodes.byId[nodeElt.dataset.id];
  setInspectorPosition(<THREE.Vector3>node.position);
  setInspectorOrientation(<THREE.Quaternion>node.orientation);
  setInspectorScale(<THREE.Vector3>node.scale);

  ui.visibleCheckbox.checked = node.visible;
  ui.layerSelect.value = <any>node.layer;

  // If it's a prefab, disable various buttons
  let isPrefab = node.prefab != null;
  ui.newActorButton.disabled = isPrefab;
  ui.newPrefabButton.disabled = isPrefab;
  ui.renameNodeButton.disabled = false;
  ui.duplicateNodeButton.disabled = false;
  ui.deleteNodeButton.disabled = false;

  if (isPrefab) {
    if (ui.prefabRow.parentElement == null) ui.inspectorTbodyElt.appendChild(ui.prefabRow);
    setInspectorPrefabScene(node.prefab.sceneAssetId);
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

  // Work around weird conversion from quaternion to euler conversion
  if (values[1] === "180" && values[2] === "180") {
    values[0] = roundForInspector(180 - THREE.Math.radToDeg(euler.x)).toString();
    values[1] = "0";
    values[2] = "0";
  }

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

export function setInspectorPrefabScene(sceneAssetId: string) {
  if (sceneAssetId != null && data.projectClient.entries.byId[sceneAssetId] != null) {
    ui.prefabInput.value = data.projectClient.entries.getPathFromId(sceneAssetId);
    ui.prefabOpenElt.disabled = false;
  } else {
    ui.prefabInput.value = "";
    ui.prefabOpenElt.disabled = true;
  }
}

function onNewNodeClick() {
  let options = {
    initialValue: SupClient.i18n.t("sceneEditor:treeView.newActor.initialValue"),
    validationLabel: SupClient.i18n.t("common:actions.create"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.newActor.prompt"), options, (name) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;
    createNewNode(name, false);
  });
}

function onNewPrefabClick() {
  let options = {
    initialValue: SupClient.i18n.t("sceneEditor:treeView.newPrefab.initialValue"),
    validationLabel: SupClient.i18n.t("common:actions.create"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.newPrefab.prompt"), options, (name) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;
    createNewNode(name, true);
  });
}

function createNewNode(name: string, prefab: boolean) {
  let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

  let offset = new THREE.Vector3(0, 0, -10).applyQuaternion(engine.cameraActor.getGlobalOrientation(new THREE.Quaternion()));
  let position = new THREE.Vector3();
  engine.cameraActor.getGlobalPosition(position).add(offset);

  if (options.parentId != null) {
    let parentMatrix = data.sceneUpdater.bySceneNodeId[options.parentId].actor.getGlobalMatrix(new THREE.Matrix4());
    position.applyMatrix4(parentMatrix.getInverse(parentMatrix));
  }
  (<any>options).transform = { position };
  (<any>options).prefab = prefab;

  socket.emit("edit:assets", SupClient.query.asset, "addNode", name, options, (err: string, nodeId: string) => {
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

  let options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.rename"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.renamePrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;

    socket.emit("edit:assets", SupClient.query.asset, "setNodeProperty", node.id, "name", newName, (err: string) => { if (err != null) alert(err); });
  });
}

function onDuplicateNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset.id];

  let options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.duplicate"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.duplicatePrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;
    let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    socket.emit("edit:assets", SupClient.query.asset, "duplicateNode", newName, node.id, options.index, (err: string, nodeId: string) => {
      if (err != null) alert(err);

      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`));
      setupSelectedNode();
    });
  });
}

function onDeleteNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length === 0) return;

  let confirmString = SupClient.i18n.t("sceneEditor:treeView.deleteConfirm");
  let validateString = SupClient.i18n.t("common:actions.delete");
  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.ConfirmDialog(confirmString, validateString, (confirm) => {
    /* tslint:enable:no-unused-expression */
    if (!confirm) return;

    for (let selectedNode of ui.nodesTreeView.selectedNodes) {
      socket.emit("edit:assets", SupClient.query.asset, "removeNode", selectedNode.dataset.id, (err: string) => { if (err != null) alert(err); });
    }
  });
}

function onTransformInputChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let transformType = event.target.parentElement.parentElement.parentElement.className;
  let inputs: HTMLInputElement[] = (<any>ui).transform[`${transformType}Elts`];

  let value: { x: number; y: number; z: number; w?: number } = {
    x: parseFloat(inputs[0].value),
    y: parseFloat(inputs[1].value),
    z: parseFloat(inputs[2].value),
  };

  if (transformType === "orientation") {
    let euler = new THREE.Euler(THREE.Math.degToRad(value.x), THREE.Math.degToRad(value.y), THREE.Math.degToRad(value.z));
    let quaternion = new THREE.Quaternion().setFromEuler(euler);
    value = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
  }
  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

  socket.emit("edit:assets", SupClient.query.asset, "setNodeProperty", nodeId, transformType, value, (err: string) => { if (err != null) alert(err); });
}

function onVisibleChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
  socket.emit("edit:assets", SupClient.query.asset, "setNodeProperty", nodeId, "visible", event.target.checked, (err: string) => { if (err != null) alert(err); });
}

function onLayerChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
  socket.emit("edit:assets", SupClient.query.asset, "setNodeProperty", nodeId, "layer", parseInt(event.target.value, 10), (err: string) => { if (err != null) alert(err); });
}

function onPrefabInput(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (event.target.value === "") {
    socket.emit("edit:assets", SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", null, (err: string) => { if (err != null) alert(err); });
  }
  else {
    let entry = SupClient.findEntryByPath(data.projectClient.entries.pub, event.target.value);
    if (entry != null && entry.type === "scene") {
      socket.emit("edit:assets", SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", entry.id, (err: string) => { if (err != null) alert(err); });
    }
  }
}

export function createComponentElement(nodeId: string, component: Component) {
  let componentElt = document.createElement("div");
  componentElt.dataset["componentId"] = component.id;

  let template = <any>document.getElementById("component-cartridge-template");
  let clone = <any>document.importNode(template.content, true);

  clone.querySelector(".type").textContent = SupClient.i18n.t(`componentEditors:${component.type}.label`);
  let table = clone.querySelector(".settings");

  let editConfig = (command: string, ...args: any[]) => {
    let callback = (err: string) => { if (err != null) alert(err); };

    // Override callback if one is given
    let lastArg = args[args.length - 1];
    if (typeof lastArg === "function") callback = args.pop();

    // Prevent setting a NaN value
    if (command === "setProperty" && typeof args[1] === "number" && isNaN(args[1])) return;

    socket.emit("edit:assets", SupClient.query.asset, "editComponent", nodeId, component.id, command, ...args, callback);
  };
  let componentEditorPlugin = SupClient.plugins["componentEditors"][component.type].content;
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
  let selectString = SupClient.i18n.t("sceneEditor:inspector.newComponent.select");
  let validateString = SupClient.i18n.t("sceneEditor:inspector.newComponent.validate");
  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.SelectDialog(selectString, ui.availableComponents, validateString, { size: 12 }, (type) => {
    /* tslint:enable:no-unused-expression */
    if (type == null) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

    socket.emit("edit:assets", SupClient.query.asset, "addComponent", nodeId, type, null, (err: string) => { if (err != null) alert(err); });
  });
}

function onDeleteComponentClick(event: any) {
  let confirmString = SupClient.i18n.t("sceneEditor:inspector.deleteComponent.confirm");
  let validateString = SupClient.i18n.t("sceneEditor:inspector.deleteComponent.validate");
  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.ConfirmDialog(confirmString, validateString, (confirm) => {
    /* tslint:enable:no-unused-expression */
    if (!confirm) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
    let componentId = event.target.parentElement.parentElement.dataset.componentId;

    socket.emit("edit:assets", SupClient.query.asset, "removeComponent", nodeId, componentId, (err: string) => { if (err != null) alert(err); });
  });
}

export function setCameraMode(mode: string) {
  engine.gameInstance.destroyComponent(engine.cameraControls);
  ui.cameraMode = mode;

  (<HTMLDivElement>document.querySelector(".controls .camera-vertical-axis")).hidden = ui.cameraMode !== "3D";
  (<HTMLDivElement>document.querySelector(".controls .camera-speed")).hidden = ui.cameraMode !== "3D";
  (<HTMLDivElement>document.querySelector(".controls .camera-2d-z")).hidden = ui.cameraMode === "3D";

  let axis = ui.cameraMode === "3D" ? ui.cameraVerticalAxis : "Y";
  engine.cameraRoot.setLocalEulerAngles(new THREE.Euler(axis === "Y" ? 0 : Math.PI / 2, 0, 0));
  updateCameraMode();
  ui.cameraModeButton.textContent = ui.cameraMode;
}

function onChangeCameraMode(event: any) {
  setCameraMode(ui.cameraMode === "3D" ? "2D" : "3D");
}

export function setCameraVerticalAxis(axis: string) {
  ui.cameraVerticalAxis = axis;

  engine.cameraRoot.setLocalEulerAngles(new THREE.Euler(axis === "Y" ? 0 : Math.PI / 2, 0, 0));
  ui.cameraVerticalAxisButton.textContent = axis;
}

function onChangeCameraVerticalAxis(event: any) {
  setCameraVerticalAxis(ui.cameraVerticalAxis === "Y" ? "Z" : "Y");
}

function onChangeCameraSpeed() {
  engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
}

function onChangeCamera2DZ() {
  let z = parseFloat(ui.camera2DZ.value);
  if (isNaN(z)) return;

  engine.cameraActor.threeObject.position.setZ(z);
  engine.cameraActor.threeObject.updateMatrixWorld(false);
}
