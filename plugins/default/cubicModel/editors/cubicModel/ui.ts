import { data } from "./network";
import engine, { setupHelpers } from "./engine";
import { setSelectedNode as setTextureAreaSelectedNode } from "./textureArea";

import CubicModelAsset from "../../data/CubicModelAsset";
import { Node } from "../../data/CubicModelNodes";

import * as TreeView from "dnd-tree-view";
import * as ResizeHandle from "resize-handle";

const THREE = SupEngine.THREE;

const ui: {
  canvasElt: HTMLCanvasElement;
  treeViewElt: HTMLDivElement;
  nodesTreeView: TreeView;

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
new ResizeHandle(document.querySelector(".texture-container") as HTMLElement, "bottom");
new ResizeHandle(document.querySelector(".sidebar") as HTMLElement, "right");
new ResizeHandle(document.querySelector(".nodes-tree-view") as HTMLElement, "top");

// Grid
ui.gridSize = 20;
ui.gridStep = 1;
document.getElementById("grid-step").addEventListener("input", onGridStepInput);
document.getElementById("grid-visible").addEventListener("change", onGridVisibleChange);

function onGridStepInput(event: UIEvent) {
  const target = (<HTMLInputElement>event.target);
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

function onChangePixelsPerUnit(event: any) { data.projectClient.editAsset(SupClient.query.asset, "setProperty", "pixelsPerUnit", parseFloat(event.target.value)); }

// Texture download
document.querySelector("button.download").addEventListener("click", (event) => {
  function triggerDownload(name: string) {
    const anchor = document.createElement("a");
    document.body.appendChild(anchor);
    anchor.style.display = "none";
    anchor.href = data.cubicModelUpdater.cubicModelAsset.clientTextureDatas["map"].ctx.canvas.toDataURL();

    // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
    (anchor as any).download = `${name}.png`;
    anchor.click();
    document.body.removeChild(anchor);
  }

  const options = {
    initialValue: SupClient.i18n.t("cubicModelEditor:sidebar.settings.cubicModel.download.defaultName"),
    validationLabel: SupClient.i18n.t("common:actions.download")
  };

  if (SupApp != null) {
    triggerDownload(options.initialValue);
  } else {
    new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("cubicModelEditor:sidebar.settings.cubicModel.download.prompt"), options, (name) => {
      if (name == null) return;
      triggerDownload(name);
    });
  }
});

// Texture size
ui.textureWidthSelect = document.querySelector("select.property-texture-width") as HTMLSelectElement;
ui.textureHeightSelect = document.querySelector("select.property-texture-height") as HTMLSelectElement;
const addOption = (parent: HTMLSelectElement, value: number) => {
  const optionElt = document.createElement("option");
  optionElt.textContent = value.toString();
  optionElt.value = value.toString();
  parent.appendChild(optionElt);
};
for (const size of CubicModelAsset.validTextureSizes) {
  addOption(ui.textureWidthSelect, size);
  addOption(ui.textureHeightSelect, size);
}
ui.textureWidthSelect.addEventListener("input", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "changeTextureWidth", parseInt(event.target.value, 10)); });
ui.textureHeightSelect.addEventListener("input", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "changeTextureHeight", parseInt(event.target.value, 10)); });

// Setup tree view
ui.treeViewElt = document.querySelector(".nodes-tree-view") as HTMLDivElement;
ui.nodesTreeView = new TreeView(ui.treeViewElt, { dragStartCallback: () => true, dropCallback: onNodesTreeViewDrop });
ui.nodesTreeView.on("activate", onNodeActivate);
ui.nodesTreeView.on("selectionChange", () => { setupSelectedNode(); });

export function createNodeElement(node: Node) {
  const liElt = document.createElement("li");
  liElt.dataset["id"] = node.id;

  const nameSpan = document.createElement("span");
  nameSpan.classList.add("name");
  nameSpan.textContent = node.name;
  liElt.appendChild(nameSpan);

  const visibleButton = document.createElement("button");
  visibleButton.textContent = SupClient.i18n.t("cubicModelEditor:sidebar.nodes.hide");
  visibleButton.classList.add("show");
  visibleButton.addEventListener("click", (event: any) => {
    event.stopPropagation();
    const { shape } = data.cubicModelUpdater.cubicModelRenderer.byNodeId[event.target.parentElement.dataset["id"]];
    shape.visible = !shape.visible;
    visibleButton.textContent = SupClient.i18n.t(`cubicModelEditor:sidebar.nodes.${(shape.visible) ? "hide" : "show"}`);
    if (shape.visible) visibleButton.classList.add("show");
    else visibleButton.classList.remove("show");
  });
  liElt.appendChild(visibleButton);

  return liElt;
}

function onNodesTreeViewDrop(event: DragEvent, dropLocation: TreeView.DropLocation, orderedNodes: HTMLLIElement[]) {
  const dropPoint = SupClient.getTreeViewDropPoint(dropLocation, data.cubicModelUpdater.cubicModelAsset.nodes);

  const nodeIds: string[] = [];
  for (const node of orderedNodes ) nodeIds.push(node.dataset["id"]);

  const sourceParentNode = data.cubicModelUpdater.cubicModelAsset.nodes.parentNodesById[nodeIds[0]];
  const sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : data.cubicModelUpdater.cubicModelAsset.nodes.pub;
  const sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (const id of nodeIds) {
    data.projectClient.editAsset(SupClient.query.asset, "moveNode", id, dropPoint.parentId, dropPoint.index + i);
    if (!sameParent || sourceChildren.indexOf(data.cubicModelUpdater.cubicModelAsset.nodes.byId[id]) >= dropPoint.index) i++;
  }
  return false;
}

function onNodeActivate() { ui.nodesTreeView.selectedNodes[0].classList.toggle("collapsed"); }

export function setupSelectedNode() {
  setupHelpers();

  // Setup texture area
  const nodeIds: string[] = [];
  for (const node of ui.nodesTreeView.selectedNodes) nodeIds.push(node.dataset["id"]);
  setTextureAreaSelectedNode(nodeIds);

  // Setup transform
  const nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt == null || ui.nodesTreeView.selectedNodes.length !== 1) {
    ui.inspectorElt.hidden = true;

    ui.renameNodeButton.disabled = true;
    ui.duplicateNodeButton.disabled = true;
    ui.deleteNodeButton.disabled = true;
    return;
  }

  ui.inspectorElt.hidden = false;

  const node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[nodeElt.dataset["id"]];
  setInspectorPosition(<THREE.Vector3>node.position);
  setInspectorOrientation(<THREE.Quaternion>node.orientation);

  // Setup shape editor
  ui.inspectorFields.shape.type.value = node.shape.type;

  setInspectorShapeOffset(<THREE.Vector3>node.shape.offset);

  ui.shapeTbodyElt.hidden = node.shape.type !== "box";
  if (!ui.shapeTbodyElt.hidden) {
    const boxSettings: any = node.shape.settings;

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
  const values = [
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
  const euler = new THREE.Euler().setFromQuaternion(orientation);

  const values = [
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
  const values = [
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
  const values = [ size.x.toString(), size.y.toString(), size.z.toString() ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.inspectorFields.shape.box.size[i].value !== values[i]) {
      ui.inspectorFields.shape.box.size[i].value = values[i];
    }
  }
}

export function setInspectorBoxStretch(stretch: THREE.Vector3) {
  const values = [
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
  const target = <HTMLInputElement>event.target;
  if (target.tagName !== "INPUT") return;

  if (target.id === "transform-space") {
    engine.transformHandleComponent.setSpace(target.checked ? "local" : "world");
  } else {
    const transformSpaceCheckbox = <HTMLInputElement>document.getElementById("transform-space");
    transformSpaceCheckbox.disabled = target.value === "scale";
    engine.transformHandleComponent.setMode(target.value);

    if (target.value === "translate") {
      ui.translateMode = target.dataset["target"];
      const linkShapeToPivot = (<HTMLInputElement>document.getElementById("translate-pivot-shape")).checked;
      if (ui.translateMode === "pivot" && linkShapeToPivot) ui.translateMode = "all";
    }
  }

  setupHelpers();
}

function onTransformSettingsClick(event: UIEvent) {
  const target = <HTMLInputElement>event.target;
  if (target.tagName !== "INPUT") return;

  if (target.id === "transform-space") {
    engine.transformHandleComponent.setSpace(target.checked ? "local" : "world");
  } else if (target.id === "translate-pivot-shape") {
    const linkShapeToPivot = (<HTMLInputElement>document.getElementById("translate-pivot-shape")).checked;
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

for (const input of ui.inspectorFields.position) input.addEventListener("change", onInspectorInputChange);
for (const input of ui.inspectorFields.orientation) input.addEventListener("change", onInspectorInputChange);

for (const input of ui.inspectorFields.shape.offset) input.addEventListener("change", onInspectorInputChange);

for (const input of ui.inspectorFields.shape.box.size) input.addEventListener("change", onInspectorInputChange);
for (const input of ui.inspectorFields.shape.box.stretch) input.addEventListener("change", onInspectorInputChange);


function onNewNodeClick() {
  // TODO: Allow choosing shape and default texture color
  const options = {
    initialValue: "Node",
    validationLabel: SupClient.i18n.t("common:actions.create")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("cubicModelEditor:sidebar.nodes.newNode.prompt"), options, (name) => {
    if (name == null) return;

    const options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    const quaternion = new THREE.Quaternion();
    engine.cameraActor.getGlobalOrientation(quaternion);
    const offset = new THREE.Vector3(0, 0, -10).applyQuaternion(quaternion);

    const position = new THREE.Vector3();
    engine.cameraActor.getGlobalPosition(position).add(offset);

    const pixelsPerunit = data.cubicModelUpdater.cubicModelAsset.pub.pixelsPerUnit;

    if (options.parentId != null) {
      const inverseParentMatrix = new THREE.Matrix4().getInverse(data.cubicModelUpdater.cubicModelRenderer.byNodeId[options.parentId].pivot.matrixWorld);
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

    data.projectClient.editAsset(SupClient.query.asset, "addNode", name, options, (nodeId: string) => {
      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement);
      setupSelectedNode();
    });

  });
}

function onRenameNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const selectedNode = ui.nodesTreeView.selectedNodes[0];
  const node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[selectedNode.dataset["id"]];

  const options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.rename")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("cubicModelEditor:sidebar.nodes.renamePrompt"), options, (newName) => {
    if (newName == null) return;

    data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", node.id, "name", newName);
  });
}

function onDuplicateNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  const selectedNode = ui.nodesTreeView.selectedNodes[0];
  const node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[selectedNode.dataset["id"]];

  const options = {
    initialValue: node.name,
    validationLabel: SupClient.i18n.t("common:actions.duplicate")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("cubicModelEditor:sidebar.nodes.duplicatePrompt"), options, (newName) => {
    if (newName == null) return;
    const options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    data.projectClient.editAsset(SupClient.query.asset, "duplicateNode", newName, node.id, options.index, (nodeId: string) => {
      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement);
      setupSelectedNode();
    });
  });
}

function onDeleteNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length === 0) return;

  const confirmLabel = SupClient.i18n.t("cubicModelEditor:sidebar.nodes.deleteConfirm");
  const validationLabel = SupClient.i18n.t("common:actions.delete");
  new SupClient.Dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
    if (!confirm) return;

    for (const selectedNode of ui.nodesTreeView.selectedNodes) {
      data.projectClient.editAsset(SupClient.query.asset, "removeNode", selectedNode.dataset["id"]);
    }
  });
}

function onInspectorInputChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;
  const nodeId = ui.nodesTreeView.selectedNodes[0].dataset["id"];

  // transform, shape or box-shape
  const context = event.target.parentElement.parentElement.parentElement.parentElement.className;
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

  const propertyType = event.target.parentElement.parentElement.parentElement.className;
  let value: any;

  if (context === "shape" && propertyType === "type") {
    // Single value
    value = uiFields[propertyType].value;
  } else {
    // Multiple values
    const inputs: HTMLInputElement[] = uiFields[propertyType];

    value = {
      x: parseFloat(inputs[0].value),
      y: parseFloat(inputs[1].value),
      z: parseFloat(inputs[2].value),
    };

    if (propertyType === "orientation") {
      const euler = new THREE.Euler(THREE.Math.degToRad(value.x), THREE.Math.degToRad(value.y), THREE.Math.degToRad(value.z));
      const quaternion = new THREE.Quaternion().setFromEuler(euler);
      value = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
    }
  }

  if (propertyType !== "position" || ui.translateMode !== "pivot")
    data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, `${path}${propertyType}`, value);
  else
    data.projectClient.editAsset(SupClient.query.asset, "moveNodePivot", nodeId, value);
}
