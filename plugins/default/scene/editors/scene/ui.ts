import { data } from "./network";
import engine, { setupHelpers, updateCameraMode } from "./engine";

import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";

import * as TreeView from "dnd-tree-view";
import * as ResizeHandle from "resize-handle";

const THREE = SupEngine.THREE;

const ui: {
  canvasElt: HTMLCanvasElement;
  treeViewElt: HTMLDivElement;
  nodesTreeView: TreeView;

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
  componentsElt: HTMLDivElement;

  cameraMode: string;
  cameraModeButton: HTMLButtonElement;
  cameraVerticalAxis: string;
  cameraVerticalAxisButton: HTMLButtonElement;
  cameraSpeedSlider: HTMLInputElement;
  camera2DZ: HTMLInputElement;

  gridCheckbox: HTMLInputElement;
  gridSize: number;
  gridStep: number;

  dropTimeout: NodeJS.Timer;
  actorDropElt: HTMLDivElement;
  componentDropElt: HTMLDivElement;
} = {} as any;
export default ui;

// Hotkeys
document.addEventListener("keydown", (event) => {
  if (document.querySelector(".dialog") != null) return;
  let activeElement = document.activeElement as HTMLElement;
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

const ignoredTagNames = [ "INPUT", "TEXTAREA", "SELECT", "BUTTON" ];
document.addEventListener("keydown", (event) => {
  if (document.querySelector("body > .dialog") != null) return;
  if (ignoredTagNames.indexOf((event.target as HTMLInputElement).tagName) !== -1) return;

  switch (event.keyCode) {
    case (window as any).KeyEvent.DOM_VK_E:
      (document.getElementById(`transform-mode-translate`) as HTMLInputElement).checked = true;
      engine.transformHandleComponent.setMode("translate");
      break;
    case (window as any).KeyEvent.DOM_VK_R:
      (document.getElementById(`transform-mode-rotate`) as HTMLInputElement).checked = true;
      engine.transformHandleComponent.setMode("rotate");
      break;
    case (window as any).KeyEvent.DOM_VK_T:
      (document.getElementById(`transform-mode-scale`) as HTMLInputElement).checked = true;
      engine.transformHandleComponent.setMode("scale");
      break;
    case (window as any).KeyEvent.DOM_VK_L:
      const localElt = document.getElementById(`transform-space`) as HTMLInputElement;
      localElt.checked = !localElt.checked;
      engine.transformHandleComponent.setSpace(localElt.checked ? "local" : "world");
      break;

    case (window as any).KeyEvent.DOM_VK_G:
      ui.gridCheckbox.checked = !ui.gridCheckbox.checked;
      engine.gridHelperComponent.setVisible(ui.gridCheckbox.checked);
      break;

    case (window as any).KeyEvent.DOM_VK_F:
      if (ui.nodesTreeView.selectedNodes.length !== 1) return;

      const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
      const position = new THREE.Box3().setFromObject(data.sceneUpdater.bySceneNodeId[nodeId].actor.threeObject).center();
      if (ui.cameraMode === "2D") position.z = engine.cameraActor.getLocalPosition(new THREE.Vector3()).z;
      engine.cameraActor.setLocalPosition(position);
      if (ui.cameraMode === "3D") engine.cameraActor.moveOriented(new THREE.Vector3(0, 0, 20));
      break;
  }
});

ui.canvasElt = document.querySelector("canvas") as HTMLCanvasElement;
ui.actorDropElt = document.querySelector(".render-area .drop-asset-container") as HTMLDivElement;
ui.componentDropElt = document.querySelector(".transform-area .drop-asset-container") as HTMLDivElement;

// Setup resizable panes
new ResizeHandle(document.querySelector(".sidebar") as HTMLElement, "right");
new ResizeHandle(document.querySelector(".nodes-tree-view") as HTMLElement, "top");

// Setup tree view
ui.treeViewElt = document.querySelector(".nodes-tree-view") as HTMLDivElement;
ui.nodesTreeView = new TreeView(ui.treeViewElt, { dragStartCallback: () => true, dropCallback: onNodesTreeViewDrop });
ui.nodesTreeView.on("activate", onNodeActivate);
ui.nodesTreeView.on("selectionChange", () => { setupSelectedNode(); });

ui.newActorButton = document.querySelector("button.new-actor") as HTMLButtonElement;
ui.newActorButton.addEventListener("click", onNewNodeClick);
ui.newPrefabButton = document.querySelector("button.new-prefab") as HTMLButtonElement;
ui.newPrefabButton.addEventListener("click", onNewPrefabClick);
ui.renameNodeButton = document.querySelector("button.rename-node") as HTMLButtonElement;
ui.renameNodeButton.addEventListener("click", onRenameNodeClick);
ui.duplicateNodeButton = document.querySelector("button.duplicate-node") as HTMLButtonElement;
ui.duplicateNodeButton.addEventListener("click", onDuplicateNodeClick);
ui.deleteNodeButton = document.querySelector("button.delete-node") as HTMLButtonElement;
ui.deleteNodeButton.addEventListener("click", onDeleteNodeClick);

// Inspector
ui.inspectorElt = document.querySelector(".inspector") as HTMLDivElement;
ui.inspectorTbodyElt = ui.inspectorElt.querySelector("tbody") as HTMLTableElement;

ui.transform = {
  positionElts: ui.inspectorElt.querySelectorAll(".transform .position input") as any,
  orientationElts: ui.inspectorElt.querySelectorAll(".transform .orientation input") as any,
  scaleElts: ui.inspectorElt.querySelectorAll(".transform .scale input") as any,
};

ui.visibleCheckbox = ui.inspectorElt.querySelector(".visible input") as HTMLInputElement;
ui.visibleCheckbox.addEventListener("change", onVisibleChange);

ui.layerSelect = ui.inspectorElt.querySelector(".layer select") as HTMLSelectElement;
ui.layerSelect.addEventListener("change", onLayerChange);

ui.prefabRow = ui.inspectorElt.querySelector(".prefab") as HTMLTableRowElement;
ui.prefabInput = ui.inspectorElt.querySelector(".prefab input") as HTMLInputElement;
ui.prefabInput.addEventListener("input", onPrefabInput);

ui.prefabOpenElt = ui.inspectorElt.querySelector(".prefab button") as HTMLButtonElement;
ui.prefabOpenElt.addEventListener("click", (event) => {
  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset["id"]];
  let id = node.prefab.sceneAssetId;
  window.parent.postMessage({ type: "openEntry", id }, window.location.origin);
});

for (let transformType in ui.transform) {
  let inputs: HTMLInputElement[] = (ui.transform as any)[transformType];
  for (let input of inputs) input.addEventListener("change", onTransformInputChange);
}

ui.newComponentButton = document.querySelector("button.new-component") as HTMLButtonElement;
ui.newComponentButton.addEventListener("click", onNewComponentClick);

ui.cameraMode = "3D";
ui.cameraModeButton = document.getElementById("toggle-camera-button") as HTMLButtonElement;
ui.cameraModeButton.addEventListener("click", onChangeCameraMode);

ui.cameraVerticalAxis = "Y";
ui.cameraVerticalAxisButton = document.getElementById("toggle-camera-vertical-axis") as HTMLButtonElement;
ui.cameraVerticalAxisButton.addEventListener("click", onChangeCameraVerticalAxis);


ui.cameraSpeedSlider = document.getElementById("camera-speed-slider") as HTMLInputElement;
ui.cameraSpeedSlider.addEventListener("input", onChangeCameraSpeed);
ui.cameraSpeedSlider.value = engine.cameraControls.movementSpeed;

ui.camera2DZ = document.getElementById("camera-2d-z") as HTMLInputElement;
ui.camera2DZ.addEventListener("input", onChangeCamera2DZ);

document.querySelector(".main .controls .transform-mode").addEventListener("click", onTransformModeClick);

ui.componentsElt = ui.inspectorElt.querySelector(".components") as HTMLDivElement;
ui.availableComponents = {};

let componentEditorPlugins: { [pluginName: string]: { path: string; content: SupClient.ComponentEditorPlugin; } };

export function start() {
  componentEditorPlugins = SupClient.getPlugins<SupClient.ComponentEditorPlugin>("componentEditors");
  SupClient.setupHotkeys();
  SupClient.setupHelpCallback(() => {
      window.parent.postMessage({ type: "openTool", name: "documentation", state: { section: "scene" } }, window.location.origin);
  });

  const componentTypes = Object.keys(componentEditorPlugins);
  componentTypes.sort((a, b) => {
    const componentLabelA = SupClient.i18n.t(`componentEditors:${a}.label`);
    const componentLabelB = SupClient.i18n.t(`componentEditors:${b}.label`);
    return componentLabelA.localeCompare(componentLabelB);
  });
  for (const componentType of componentTypes) ui.availableComponents[componentType] = SupClient.i18n.t(`componentEditors:${componentType}.label`);

  document.addEventListener("dragover", onDragOver);
  document.addEventListener("drop", onStopDrag);
  ui.actorDropElt.addEventListener("dragenter", onActorDragEnter);
  ui.actorDropElt.addEventListener("dragleave", onActorDragLeave);
  ui.actorDropElt.addEventListener("drop", onActorDrop);
  ui.componentDropElt.addEventListener("dragenter", onComponentDragEnter);
  ui.componentDropElt.addEventListener("dragleave", onComponentDragLeave);
  ui.componentDropElt.addEventListener("drop", onComponentDrop);

  (document.querySelector(".main .loading") as HTMLDivElement).hidden = true;
  (document.querySelector(".main .controls") as HTMLDivElement).hidden = false;
  (document.querySelector(".render-area") as HTMLDivElement).hidden = false;
  ui.newActorButton.disabled = false;
  ui.newPrefabButton.disabled = false;
}

// Transform
function onTransformModeClick(event: any) {
  if (event.target.tagName !== "INPUT") return;

  if (event.target.id === "transform-space") {
    engine.transformHandleComponent.setSpace(event.target.checked ? "local" : "world");
  } else {
    let transformSpaceCheckbox = document.getElementById("transform-space") as HTMLInputElement;
    transformSpaceCheckbox.disabled = event.target.value === "scale";
    engine.transformHandleComponent.setMode(event.target.value);
  }
}

// Grid
ui.gridCheckbox = document.getElementById("grid-visible") as HTMLInputElement;
ui.gridCheckbox.addEventListener("change", onGridVisibleChange);
ui.gridSize = 80;
ui.gridStep = 1;
document.getElementById("grid-step").addEventListener("input", onGridStepInput);

function onGridStepInput(event: UIEvent) {
  let target = event.target as HTMLInputElement;
  let value = parseFloat(target.value);
  if (value !== 0 && value < 0.0001) { value = 0; target.value = "0"; }
  if (isNaN(value) || value <= 0) { (target as any).reportValidity(); return; }

  ui.gridStep = value;
  engine.gridHelperComponent.setup(ui.gridSize, ui.gridStep);
}

function onGridVisibleChange(event: UIEvent) {
  engine.gridHelperComponent.setVisible((event.target as HTMLInputElement).checked);
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

function onNodesTreeViewDrop(event: DragEvent, dropLocation: TreeView.DropLocation, orderedNodes: HTMLLIElement[]) {
  if (orderedNodes == null) return false;

  const dropPoint = SupClient.getTreeViewDropPoint(dropLocation, data.sceneUpdater.sceneAsset.nodes);

  const nodeIds: string[] = [];
  for (let node of orderedNodes ) nodeIds.push(node.dataset["id"]);

  const sourceParentNode = data.sceneUpdater.sceneAsset.nodes.parentNodesById[nodeIds[0]];
  const sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : data.sceneUpdater.sceneAsset.nodes.pub;
  const sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (const id of nodeIds) {
    data.projectClient.editAsset(SupClient.query.asset, "moveNode", id, dropPoint.parentId, dropPoint.index + i);
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

  let node = data.sceneUpdater.sceneAsset.nodes.byId[nodeElt.dataset["id"]];
  setInspectorPosition(node.position as THREE.Vector3);
  setInspectorOrientation(node.orientation as THREE.Quaternion);
  setInspectorScale(node.scale as THREE.Vector3);

  ui.visibleCheckbox.checked = node.visible;
  ui.layerSelect.value = node.layer.toString();

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
  ui.componentsElt.innerHTML = "";

  for (let component of node.components) {
    let componentElt = createComponentElement(node.id, component);
    ui.componentsElt.appendChild(componentElt);
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
  ui.layerSelect.value = layer.toString();
}

export function setupInspectorLayers() {
  while (ui.layerSelect.childElementCount > data.gameSettingsResource.pub.customLayers.length + 1) ui.layerSelect.removeChild(ui.layerSelect.lastElementChild);

  let optionElt = ui.layerSelect.firstElementChild.nextElementSibling as HTMLOptionElement;
  for (let i = 0; i < data.gameSettingsResource.pub.customLayers.length; i++) {
    if (optionElt == null) {
      optionElt = document.createElement("option");
      ui.layerSelect.appendChild(optionElt);
    }
    optionElt.value = (i + 1).toString(); // + 1 because "Default" is 0
    optionElt.textContent = data.gameSettingsResource.pub.customLayers[i];

    optionElt = optionElt.nextElementSibling as HTMLOptionElement;
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
  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.newActor.prompt"), options, (name) => {
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
  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.newPrefab.prompt"), options, (name) => {
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
  (options as any).transform = { position };
  (options as any).prefab = prefab;

  data.projectClient.editAsset(SupClient.query.asset, "addNode", name, options, (nodeId: string) => {
    ui.nodesTreeView.clearSelection();
    ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement);
    setupSelectedNode();
  });
}

function onRenameNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset["id"]];

  let options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.rename"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.renamePrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;

    data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", node.id, "name", newName);
  });
}

function onDuplicateNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[selectedNode.dataset["id"]];

  let options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.duplicate"),
    pattern: SupClient.namePattern,
    title: SupClient.i18n.t("common:namePatternDescription")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("sceneEditor:treeView.duplicatePrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;
    let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);
    console.log(options);

    data.projectClient.editAsset(SupClient.query.asset, "duplicateNode", newName, node.id, options.index, (nodeId: string) => {
      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement);
      setupSelectedNode();
    });
  });
}

function onDeleteNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length === 0) return;

  let confirmLabel = SupClient.i18n.t("sceneEditor:treeView.deleteConfirm");
  let validationLabel = SupClient.i18n.t("common:actions.delete");
  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
    /* tslint:enable:no-unused-expression */
    if (!confirm) return;

    for (let selectedNode of ui.nodesTreeView.selectedNodes) {
      data.projectClient.editAsset(SupClient.query.asset, "removeNode", selectedNode.dataset["id"]);
    }
  });
}

function onTransformInputChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let transformType = event.target.parentElement.parentElement.parentElement.className;
  let inputs: HTMLInputElement[] = (ui.transform as any)[`${transformType}Elts`];

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
  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

  data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, transformType, value);
}

function onVisibleChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
  data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "visible", event.target.checked);
}

function onLayerChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
  data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "layer", parseInt(event.target.value, 10));
}

function onPrefabInput(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

  if (event.target.value === "") {
    data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", null);
  }
  else {
    let entry = SupClient.findEntryByPath(data.projectClient.entries.pub, event.target.value);
    if (entry != null && entry.type === "scene") {
      data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", entry.id);
    }
  }
}

export function createComponentElement(nodeId: string, component: Component) {
  let componentElt = document.createElement("div");
  componentElt.dataset["componentId"] = component.id;

  let template = document.getElementById("component-cartridge-template") as HTMLElement;
  let clone = document.importNode((template as any).content, true) as HTMLElement;

  clone.querySelector(".type").textContent = SupClient.i18n.t(`componentEditors:${component.type}.label`);
  let table = clone.querySelector(".settings") as HTMLElement;

  let editConfig = (command: string, ...args: any[]) => {
    let callback = (err: string) => {
      /* tslint:disable:no-unused-expression */
      if (err != null) new SupClient.Dialogs.InfoDialog(err);
      /* tslint:enable:no-unused-expression */
    };

    // Override callback if one is given
    let lastArg = args[args.length - 1];
    if (typeof lastArg === "function") callback = args.pop();

    // Prevent setting a NaN value
    if (command === "setProperty" && typeof args[1] === "number" && isNaN(args[1])) return;

    data.projectClient.editAsset(SupClient.query.asset, "editComponent", nodeId, component.id, command, ...args, callback);
  };
  const componentEditorPlugin = componentEditorPlugins[component.type].content;
  ui.componentEditors[component.id] = new componentEditorPlugin(table.querySelector("tbody") as HTMLTableSectionElement, component.config, data.projectClient, editConfig);

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
  let selectLabel = SupClient.i18n.t("sceneEditor:inspector.newComponent.select");
  let validationLabel = SupClient.i18n.t("sceneEditor:inspector.newComponent.validate");
  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.SelectDialog(selectLabel, ui.availableComponents, { validationLabel, size: 12 }, (type) => {
    /* tslint:enable:no-unused-expression */
    if (type == null) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

    data.projectClient.editAsset(SupClient.query.asset, "addComponent", nodeId, type, null);
  });
}

function onDeleteComponentClick(event: any) {
  let confirmLabel = SupClient.i18n.t("sceneEditor:inspector.deleteComponent.confirm");
  let validationLabel = SupClient.i18n.t("sceneEditor:inspector.deleteComponent.validate");
  /* tslint:disable:no-unused-expression */
  new SupClient.Dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
    /* tslint:enable:no-unused-expression */
    if (!confirm) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
    let componentId = event.target.parentElement.parentElement.dataset["componentId"];

    data.projectClient.editAsset(SupClient.query.asset, "removeComponent", nodeId, componentId);
  });
}

export function setCameraMode(mode: string) {
  engine.gameInstance.destroyComponent(engine.cameraControls);
  ui.cameraMode = mode;

  (document.querySelector(".controls .camera-vertical-axis") as HTMLDivElement).hidden = ui.cameraMode !== "3D";
  (document.querySelector(".controls .camera-speed") as HTMLDivElement).hidden = ui.cameraMode !== "3D";
  (document.querySelector(".controls .camera-2d-z") as HTMLDivElement).hidden = ui.cameraMode === "3D";

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

// Drag'n'drop
function onDragOver(event: DragEvent) {
  if (data == null || data.projectClient.entries == null) return;

  // NOTE: We can't use event.dataTransfer.getData() to do an early check here
  // because of browser security restrictions

  ui.actorDropElt.hidden = false;
  if (ui.nodesTreeView.selectedNodes.length === 1) {
    const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
    const node = data.sceneUpdater.sceneAsset.nodes.byId[nodeId];
    if (node.prefab == null) ui.componentDropElt.hidden = false;
  }

  // Ensure we're not hovering the nodes tree view or component area
  let ancestorElt = (event.target as HTMLElement).parentElement;
  let preventDefaultBehavior = true;
  while (ancestorElt != null) {
    if (ancestorElt === ui.componentsElt || ancestorElt === ui.treeViewElt || (ui.componentDropElt.hidden && ancestorElt === ui.prefabRow)) {
      preventDefaultBehavior = false;
      break;
    }
    ancestorElt = ancestorElt.parentElement;
  }
  if (preventDefaultBehavior) event.preventDefault();

  if (ui.dropTimeout != null) clearTimeout(ui.dropTimeout);
  ui.dropTimeout = setTimeout(() => { onStopDrag(); }, 300);
}

function onStopDrag() {
  if (ui.dropTimeout != null) {
    clearTimeout(ui.dropTimeout);
    ui.dropTimeout = null;
  }
  ui.actorDropElt.hidden = true;
  ui.actorDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", false);
  ui.componentDropElt.hidden = true;
  ui.componentDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", false);
}

function onActorDragEnter(event: DragEvent) { ui.actorDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", true); }
function onActorDragLeave(event: DragEvent) { ui.actorDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", false); }
function onActorDrop(event: DragEvent) {
  if (data == null || data.projectClient.entries == null) return;

  let entryId = event.dataTransfer.getData("application/vnd.superpowers.entry");
  if (typeof entryId !== "string") return;

  let entry = data.projectClient.entries.byId[entryId];
  let plugin = SupClient.getPlugins<SupClient.ImportIntoScenePlugin>("importIntoScene")[entry.type];
  if (plugin == null || plugin.content.importActor == null) {
    const reason = SupClient.i18n.t("sceneEditor:errors.cantImportAssetTypeIntoScene");
    new SupClient.Dialogs.InfoDialog(SupClient.i18n.t("sceneEditor:failures.importIntoScene", { reason }));
    return;
  }
  event.preventDefault();

  const raycaster = new THREE.Raycaster();
  const mousePosition = { x: (event.clientX / ui.canvasElt.clientWidth) * 2 - 1, y: -(event.clientY / ui.canvasElt.clientHeight) * 2 + 1 };
  raycaster.setFromCamera(mousePosition, engine.cameraComponent.threeCamera);

  const plane = new THREE.Plane();
  const offset = new THREE.Vector3(0, 0, -10).applyQuaternion(engine.cameraActor.getGlobalOrientation(new THREE.Quaternion()));
  const planePosition = engine.cameraActor.getGlobalPosition(new THREE.Vector3()).add(offset);
  plane.setFromNormalAndCoplanarPoint(offset.normalize(), planePosition);

  const position = raycaster.ray.intersectPlane(plane);

  const options = { transform: { position }, prefab: false };
  plugin.content.importActor(entry, data.projectClient, options, (err: string, nodeId: string) => {
    if (err != null) {
      new SupClient.Dialogs.InfoDialog(SupClient.i18n.t("sceneEditor:failures.importIntoScene", { reason: err }));
      return;
    }

    ui.nodesTreeView.clearSelection();
    const entryElt = ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement;
    ui.nodesTreeView.addToSelection(entryElt);
    ui.nodesTreeView.scrollIntoView(entryElt);
    setupSelectedNode();

    ui.canvasElt.focus();
  });
}

function onComponentDragEnter(event: DragEvent) { ui.componentDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", true); }
function onComponentDragLeave(event: DragEvent) { ui.componentDropElt.querySelector(".drop-asset-text").classList.toggle("can-drop", false); }
function onComponentDrop(event: DragEvent) {
  if (data == null || data.projectClient.entries == null) return;

  let entryId = event.dataTransfer.getData("application/vnd.superpowers.entry");
  if (typeof entryId !== "string") return;

  let entry = data.projectClient.entries.byId[entryId];
  let plugin = SupClient.getPlugins<SupClient.ImportIntoScenePlugin>("importIntoScene")[entry.type];
  if (plugin == null || plugin.content.importComponent == null) {
    const reason = SupClient.i18n.t("sceneEditor:errors.cantImportAssetTypeIntoScene");
    new SupClient.Dialogs.InfoDialog(SupClient.i18n.t("sceneEditor:failures.importIntoScene", { reason }));
    return;
  }
  event.preventDefault();

  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];
  plugin.content.importComponent(entry, data.projectClient, nodeId, (err: string, nodeId: string) => { /* Ignore */ });
}
