import { data, editAsset } from "./network";
import engine, { setupHelpers } from "./engine";
import { setSelectedNode as setTextureAreaSelectedNode } from "./textureArea";

import CubicModelAsset from "../../data/CubicModelAsset";
import { Node } from "../../data/CubicModelNodes";

let THREE = SupEngine.THREE;
/* tslint:disable */
let PerfectResize = require("perfect-resize");
let TreeView = require("dnd-tree-view");
/* tslint:enable */

let ui: {
  canvasElt: HTMLCanvasElement;
  treeViewElt: HTMLDivElement;
  nodesTreeView: any;

  translateMode: string;

  gridSize: number;
  gridStep: number;

  pixelsPerUnitInput?: HTMLInputElement;
  textureWidthSelect?: HTMLSelectElement;
  textureHeightSelect?: HTMLSelectElement;

  newNodeButton: HTMLButtonElement;
  renameNodeButton: HTMLButtonElement;
  duplicateNodeButton: HTMLButtonElement;
  deleteNodeButton: HTMLButtonElement;

  inspectorElt: HTMLDivElement;
  shapeTbodyElt: HTMLTableSectionElement;

  inspectorFields: {
    position: HTMLInputElement[];
    orientation: HTMLInputElement[];

    shape: {
      type: HTMLSelectElement;
      offset: HTMLInputElement[];

      box: {
        size: HTMLInputElement[];
        stretch: HTMLInputElement[];
      }
    }
  }
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
    onNewNodeClick();
  }

  if (event.keyCode === 113) { // F2
    event.preventDefault();
    onRenameNodeClick();
  }

  if (event.keyCode === 68 && (event.ctrlKey || event.metaKey)) { // Ctrl+D
    event.preventDefault();
    onDuplicateNodeClick();
  }

  if (event.keyCode === 46) { // Delete
    event.preventDefault();
    onDeleteNodeClick();
  }
});

ui.canvasElt = <HTMLCanvasElement>document.querySelector("canvas");

// Setup resizable panes
new PerfectResize(document.querySelector(".texture-container"), "bottom");
new PerfectResize(document.querySelector(".sidebar"), "right");
new PerfectResize(document.querySelector(".nodes-tree-view"), "top");

// Grid
ui.gridSize = 20;
ui.gridStep = 1;
document.getElementById("grid-step").addEventListener("input", onGridStepInput);
document.getElementById("grid-visible").addEventListener("change", onGridVisibleChange);

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

// Unit ratio
ui.pixelsPerUnitInput = <HTMLInputElement>document.querySelector("input.property-pixelsPerUnit");
ui.pixelsPerUnitInput.addEventListener("change", onChangePixelsPerUnit);

function onChangePixelsPerUnit(event: any) { editAsset("setProperty", "pixelsPerUnit", parseFloat(event.target.value)); }

// Texture download
document.querySelector("button.download").addEventListener("click", (event) => {
  function triggerDownload(name: string) {
    let anchor = document.createElement("a");
    document.body.appendChild(anchor);
    anchor.style.display = "none";
    anchor.href = data.cubicModelUpdater.cubicModelAsset.clientTextureDatas["map"].ctx.canvas.toDataURL();

    // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
    (anchor as any).download = `${name}.png`;
    anchor.click();
    document.body.removeChild(anchor);
  }

  let options = {
    initialValue: SupClient.i18n.t("cubicModelEditor:sidebar.settings.cubicModel.download.defaultName"),
    validationLabel: SupClient.i18n.t("common:actions.download")
  };

  if (SupClient.isApp) {
    triggerDownload(options.initialValue);
  } else {
    /* tslint:disable:no-unused-expression */
    new SupClient.dialogs.PromptDialog(SupClient.i18n.t("cubicModelEditor:sidebar.settings.cubicModel.download.prompt"), options, (name) => {
      /* tslint:enable:no-unused-expression */
      if (name == null) return;
      triggerDownload(name);
    });
  }
});

// Texture size
ui.textureWidthSelect = document.querySelector("select.property-texture-width") as HTMLSelectElement;
ui.textureHeightSelect = document.querySelector("select.property-texture-height") as HTMLSelectElement;
let addOption = (parent: HTMLSelectElement, value: number) => {
  let optionElt = document.createElement("option");
  optionElt.textContent = value.toString();
  optionElt.value = value.toString();
  parent.appendChild(optionElt);
};
for (let size of CubicModelAsset.validTextureSizes) {
  addOption(ui.textureWidthSelect, size);
  addOption(ui.textureHeightSelect, size);
}
ui.textureWidthSelect.addEventListener("input", (event: any) => { editAsset("changeTextureWidth", parseInt(event.target.value, 10)); });
ui.textureHeightSelect.addEventListener("input", (event: any) => { editAsset("changeTextureHeight", parseInt(event.target.value, 10)); });

// Setup tree view
ui.treeViewElt = <HTMLDivElement>document.querySelector(".nodes-tree-view");
ui.nodesTreeView = new TreeView(document.querySelector(".nodes-tree-view"), { dropCallback: onNodeDrop });
ui.nodesTreeView.on("activate", onNodeActivate);
ui.nodesTreeView.on("selectionChange", () => { setupSelectedNode(); });

export function createNodeElement(node: Node) {
  let liElt = document.createElement("li");
  liElt.dataset["id"] = node.id;

  let nameSpan = document.createElement("span");
  nameSpan.classList.add("name");
  nameSpan.textContent = node.name;
  liElt.appendChild(nameSpan);

  let visibleButton = document.createElement("button");
  visibleButton.textContent = SupClient.i18n.t("cubicModelEditor:sidebar.nodes.hide");
  visibleButton.classList.add("show");
  visibleButton.addEventListener("click", (event: any) => {
    event.stopPropagation();
    let { shape } = data.cubicModelUpdater.cubicModelRenderer.byNodeId[event.target.parentElement.dataset["id"]];
    shape.visible = !shape.visible;
    visibleButton.textContent = SupClient.i18n.t(`cubicModelEditor:sidebar.nodes.${(shape.visible) ? "hide" : "show"}`)
    if (shape.visible) visibleButton.classList.add("show");
    else visibleButton.classList.remove("show");
  });
  liElt.appendChild(visibleButton);

  return liElt;
}

function onNodeDrop(dropInfo: any, orderedNodes: any) {
  let dropPoint = SupClient.getTreeViewDropPoint(dropInfo, data.cubicModelUpdater.cubicModelAsset.nodes);

  let nodeIds: string[] = [];
  for (let node of orderedNodes ) nodeIds.push(node.dataset.id);

  let sourceParentNode = data.cubicModelUpdater.cubicModelAsset.nodes.parentNodesById[nodeIds[0]];
  let sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : data.cubicModelUpdater.cubicModelAsset.nodes.pub;
  let sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (let id of nodeIds) {
    editAsset("moveNode", id, dropPoint.parentId, dropPoint.index + i);
    if (!sameParent || sourceChildren.indexOf(data.cubicModelUpdater.cubicModelAsset.nodes.byId[id]) >= dropPoint.index) i++;
  }
  return false;
}

function onNodeActivate() { ui.nodesTreeView.selectedNodes[0].classList.toggle("collapsed"); }

export function setupSelectedNode() {
  setupHelpers();

  // Setup texture area
  let nodeIds: string[] = [];
  for (let node of ui.nodesTreeView.selectedNodes) nodeIds.push(node.dataset.id);
  setTextureAreaSelectedNode(nodeIds);

  // Setup transform
  let nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt == null || ui.nodesTreeView.selectedNodes.length !== 1) {
    ui.inspectorElt.hidden = true;

    ui.renameNodeButton.disabled = true;
    ui.duplicateNodeButton.disabled = true;
    ui.deleteNodeButton.disabled = true;
    return;
  }

  ui.inspectorElt.hidden = false;

  let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[nodeElt.dataset.id];
  setInspectorPosition(<THREE.Vector3>node.position);
  setInspectorOrientation(<THREE.Quaternion>node.orientation);

  // Setup shape editor
  ui.inspectorFields.shape.type.value = node.shape.type;

  setInspectorShapeOffset(<THREE.Vector3>node.shape.offset);

  ui.shapeTbodyElt.hidden = node.shape.type !== "box";
  if (!ui.shapeTbodyElt.hidden) {
    let boxSettings: any = node.shape.settings;

    setInspectorBoxSize(<THREE.Vector3>boxSettings.size);
    setInspectorBoxStretch(<THREE.Vector3>boxSettings.stretch);
  }

  // Enable buttons
  ui.renameNodeButton.disabled = false;
  ui.duplicateNodeButton.disabled = false;
  ui.deleteNodeButton.disabled = false;
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
    if (ui.inspectorFields.position[i].value !== values[i]) {
      ui.inspectorFields.position[i].value = values[i];
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
    if (ui.inspectorFields.orientation[i].value !== values[i]) {
      ui.inspectorFields.orientation[i].value = values[i];
    }
  }
}

export function setInspectorShapeOffset(offset: THREE.Vector3) {
  let values = [
    roundForInspector(offset.x).toString(),
    roundForInspector(offset.y).toString(),
    roundForInspector(offset.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.inspectorFields.shape.offset[i].value !== values[i]) {
      ui.inspectorFields.shape.offset[i].value = values[i];
    }
  }
}

export function setInspectorBoxSize(size: THREE.Vector3) {
  let values = [ size.x.toString(), size.y.toString(), size.z.toString() ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.inspectorFields.shape.box.size[i].value !== values[i]) {
      ui.inspectorFields.shape.box.size[i].value = values[i];
    }
  }
}

export function setInspectorBoxStretch(stretch: THREE.Vector3) {
  let values = [
    roundForInspector(stretch.x).toString(),
    roundForInspector(stretch.y).toString(),
    roundForInspector(stretch.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.inspectorFields.shape.box.stretch[i].value !== values[i]) {
      ui.inspectorFields.shape.box.stretch[i].value = values[i];
    }
  }
}

// Transform mode
ui.translateMode = "all";
document.querySelector(".main .controls .transform-mode").addEventListener("click", onTransformModeClick);
document.querySelector(".main .controls .transform-settings").addEventListener("click", onTransformSettingsClick);

function onTransformModeClick(event: UIEvent) {
  let target = <HTMLInputElement>event.target;
  if (target.tagName !== "INPUT") return;

  if (target.id === "transform-space") {
    engine.transformHandleComponent.setSpace(target.checked ? "local" : "world");
  } else {
    let transformSpaceCheckbox = <HTMLInputElement>document.getElementById("transform-space");
    transformSpaceCheckbox.disabled = target.value === "scale";
    engine.transformHandleComponent.setMode(target.value);

    if (target.value === "translate") {
      ui.translateMode = target.dataset["target"];
      let linkShapeToPivot = (<HTMLInputElement>document.getElementById("translate-pivot-shape")).checked;
      if (ui.translateMode === "pivot" && linkShapeToPivot) ui.translateMode = "all";
    }
  }

  setupHelpers();
}

function onTransformSettingsClick(event: UIEvent) {
  let target = <HTMLInputElement>event.target;
  if (target.tagName !== "INPUT") return;

  if (target.id === "transform-space") {
    engine.transformHandleComponent.setSpace(target.checked ? "local" : "world");
  } else if (target.id === "translate-pivot-shape") {
    let linkShapeToPivot = (<HTMLInputElement>document.getElementById("translate-pivot-shape")).checked;
    if (ui.translateMode === "pivot" && linkShapeToPivot) ui.translateMode = "all";
    else if (ui.translateMode === "all" && !linkShapeToPivot) ui.translateMode = "pivot";
  }
}


// Node buttons
ui.newNodeButton = <HTMLButtonElement>document.querySelector("button.new-node");
ui.newNodeButton.addEventListener("click", onNewNodeClick);
ui.renameNodeButton = <HTMLButtonElement>document.querySelector("button.rename-node");
ui.renameNodeButton.addEventListener("click", onRenameNodeClick);
ui.duplicateNodeButton = <HTMLButtonElement>document.querySelector("button.duplicate-node");
ui.duplicateNodeButton.addEventListener("click", onDuplicateNodeClick);
ui.deleteNodeButton = <HTMLButtonElement>document.querySelector("button.delete-node");
ui.deleteNodeButton.addEventListener("click", onDeleteNodeClick);

// Inspector
ui.inspectorElt = <any>document.querySelector(".inspector");
ui.shapeTbodyElt = <any>ui.inspectorElt.querySelector(".box-shape");

ui.inspectorFields = {
  position: <any>ui.inspectorElt.querySelectorAll(".transform .position input"),
  orientation: <any>ui.inspectorElt.querySelectorAll(".transform .orientation input"),

  shape: {
    type: <any>ui.inspectorElt.querySelector(".shape .type select"),
    offset: <any>ui.inspectorElt.querySelectorAll(".shape .offset input"),
    box: {
      size: <any>ui.inspectorElt.querySelectorAll(".box-shape .size input"),
      stretch: <any>ui.inspectorElt.querySelectorAll(".box-shape .stretch input")
    }
  }
};

for (let input of ui.inspectorFields.position) input.addEventListener("change", onInspectorInputChange);
for (let input of ui.inspectorFields.orientation) input.addEventListener("change", onInspectorInputChange);

for (let input of ui.inspectorFields.shape.offset) input.addEventListener("change", onInspectorInputChange);

for (let input of ui.inspectorFields.shape.box.size) input.addEventListener("change", onInspectorInputChange);
for (let input of ui.inspectorFields.shape.box.stretch) input.addEventListener("change", onInspectorInputChange);


function onNewNodeClick() {
  // TODO: Allow choosing shape and default texture color
  let options = {
    initialValue: "Node",
    validationLabel: SupClient.i18n.t("common:actions.create")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("cubicModelEditor:sidebar.nodes.newNode.prompt"), options, (name) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;

    let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    let quaternion = new THREE.Quaternion();
    engine.cameraActor.getGlobalOrientation(quaternion);
    let offset = new THREE.Vector3(0, 0, -10).applyQuaternion(quaternion);

    let position = new THREE.Vector3();
    engine.cameraActor.getGlobalPosition(position).add(offset);

    let pixelsPerunit = data.cubicModelUpdater.cubicModelAsset.pub.pixelsPerUnit;

    if (options.parentId != null) {
      let inverseParentMatrix = new THREE.Matrix4().getInverse(data.cubicModelUpdater.cubicModelRenderer.byNodeId[options.parentId].pivot.matrixWorld);
      position.applyMatrix4(inverseParentMatrix);
    } else {
      position.multiplyScalar(pixelsPerunit);
    }

    (<any>options).transform = { position };
    (<any>options).shape = {
      type: "box",
      offset: { x: 0, y: 0, z: 0 },
      settings: {
        size: { x: pixelsPerunit, y: pixelsPerunit, z: pixelsPerunit },
        stretch: { x: 1, y: 1, z: 1 }
      }
    };

    editAsset("addNode", name, options, (nodeId: string) => {
      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`));
      setupSelectedNode();
    });

  });
}

function onRenameNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[selectedNode.dataset.id];

  let options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.rename")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("cubicModelEditor:sidebar.nodes.renamePrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;

    editAsset("setNodeProperty", node.id, "name", newName);
  });
}

function onDuplicateNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[selectedNode.dataset.id];

  let options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.duplicate")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("cubicModelEditor:sidebar.nodes.duplicatePrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;
    let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    editAsset("duplicateNode", newName, node.id, options.index, (err: string, nodeId: string) => {
      if (err != null) { new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); return; }

      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`));
      setupSelectedNode();
    });
  });
}

function onDeleteNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length === 0) return;

  let confirmString = SupClient.i18n.t("cubicModelEditor:sidebar.nodes.deleteConfirm");
  let validateString = SupClient.i18n.t("common:actions.delete");
  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.ConfirmDialog(confirmString, validateString, (confirm) => {
    /* tslint:enable:no-unused-expression */
    if (!confirm) return;

    for (let selectedNode of ui.nodesTreeView.selectedNodes) {
      editAsset("removeNode", selectedNode.dataset.id);
    }
  });
}

function onInspectorInputChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;
  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

  // transform, shape or box-shape
  let context = event.target.parentElement.parentElement.parentElement.parentElement.className;
  let path: string;
  let uiFields: any;

  if (context === "transform") {
    path = "";
    uiFields = ui.inspectorFields;
  } else if (context === "shape") {
    path = "shape.";
    uiFields = ui.inspectorFields.shape;
  } else if (context === "box-shape") {
    path = "shape.settings.";
    uiFields = ui.inspectorFields.shape.box;
  } else throw new Error("Unsupported inspector input context");

  let propertyType = event.target.parentElement.parentElement.parentElement.className;
  let value: any;

  if (context === "shape" && propertyType === "type") {
    // Single value
    value = uiFields[propertyType].value;
  } else {
    // Multiple values
    let inputs: HTMLInputElement[] = uiFields[propertyType];

    value = {
      x: parseFloat(inputs[0].value),
      y: parseFloat(inputs[1].value),
      z: parseFloat(inputs[2].value),
    };

    if (propertyType === "orientation") {
      let euler = new THREE.Euler(THREE.Math.degToRad(value.x), THREE.Math.degToRad(value.y), THREE.Math.degToRad(value.z));
      let quaternion = new THREE.Quaternion().setFromEuler(euler);
      value = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
    }
  }

  if (propertyType !== "position" || ui.translateMode !== "pivot") {
    editAsset("setNodeProperty", nodeId, `${path}${propertyType}`, value);
  } else {
    editAsset("moveNodePivot", nodeId, value);
  }
}
