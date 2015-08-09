import info from "./info";
import { data, editAsset } from "./network";

import importModel from "./importers/index";
import ModelAsset from "../../data/ModelAsset";

let PerfectResize = require("perfect-resize");
let TreeView = require("dnd-tree-view");

let ui: {
  opacityCheckbox?: HTMLInputElement;
  opacityInput?: HTMLInputElement;

  animationsTreeView?: any;
  selectedAnimationId?: string;

  errorPane?: HTMLDivElement;
  errorPaneStatus?: HTMLDivElement;
  errorPaneInfo?: HTMLDivElement;
  errorsTBody?: HTMLTableSectionElement;

  mapUploadButton?: HTMLInputElement;
  texturesCheckbox?: HTMLInputElement;
  texturesPane?: HTMLDivElement;
  texturesTreeView?: any;
  selectedTextureName?: string;

  mapSlotsInput?: { [name: string]: HTMLInputElement };

} = {};
export default ui;

SupClient.setupHotkeys();

// Model upload
let modelFileSelect = <HTMLInputElement> document.querySelector(".model input.file-select");
modelFileSelect.addEventListener("change", onModelFileSelectChange);
document.querySelector(".model button.upload").addEventListener("click", () => { modelFileSelect.click(); });

// Primary map upload
let primaryMapFileSelect = <HTMLInputElement>document.querySelector(".map input.file-select")
primaryMapFileSelect.addEventListener("change", onPrimaryMapFileSelectChange);
ui.mapUploadButton = <HTMLInputElement>document.querySelector(".map button.upload");
ui.mapUploadButton.addEventListener("click", () => { primaryMapFileSelect.click(); });

// Show skeleton
let showSkeletonCheckbox = <HTMLInputElement>document.querySelector(".show-skeleton");
showSkeletonCheckbox.addEventListener("change", onShowSkeletonChange);

// Opacity
ui.opacityCheckbox = <HTMLInputElement>document.querySelector("input.opacity-checkbox");
ui.opacityCheckbox.addEventListener("click", onCheckOpacity);

ui.opacityInput = <HTMLInputElement>document.querySelector("input.property-opacity");
ui.opacityInput.addEventListener("input", onChangeOpacity);

// Animations
ui.animationsTreeView = new TreeView(document.querySelector(".animations-tree-view"), onAnimationDrop);
ui.animationsTreeView.on("selectionChange", updateSelectedAnimation);

document.querySelector("button.new-animation").addEventListener("click", onNewAnimationClick);

// Animation upload
let animationFileSelect = <HTMLInputElement>document.querySelector(".upload-animation.file-select");
animationFileSelect.addEventListener("change", onAnimationFileSelectChange);
document.querySelector("button.upload-animation").addEventListener("click", () => { animationFileSelect.click(); });
document.querySelector("button.rename-animation").addEventListener("click", onRenameAnimationClick);
document.querySelector("button.delete-animation").addEventListener("click", onDeleteAnimationClick);

// Advanced textures
ui.texturesPane = <HTMLDivElement>document.querySelector(".advanced-textures");
new PerfectResize(ui.texturesPane, "bottom");

ui.texturesCheckbox = <HTMLInputElement>document.querySelector(".advanced-textures-checkbox");
ui.texturesCheckbox.addEventListener("click", onCheckAdvancedTextures);

ui.texturesTreeView = new TreeView(document.querySelector(".textures-tree-view"));
ui.texturesTreeView.on("selectionChange", updateSelectedMap);

ui.mapSlotsInput = {};
for (let slotName in ModelAsset.schema.mapSlots.properties) {
  ui.mapSlotsInput[slotName] = <HTMLInputElement>document.querySelector(`.map-${slotName}`);
  (<any>ui.mapSlotsInput[slotName].dataset).name = slotName;
  ui.mapSlotsInput[slotName].addEventListener("input", onEditMapSlot);
}

document.querySelector("button.new-map").addEventListener("click", onNewMapClick);
let mapFileSelect = <HTMLInputElement>document.querySelector(".upload-map.file-select");
mapFileSelect.addEventListener("change", onMapFileSelectChange);
document.querySelector("button.upload-map").addEventListener("click", () => { mapFileSelect.click(); });
document.querySelector("button.rename-map").addEventListener("click", onRenameMapClick);
document.querySelector("button.delete-map").addEventListener("click", onDeleteMapClick);

// Error pane
ui.errorPane = <HTMLDivElement>document.querySelector(".error-pane");
ui.errorPaneStatus = <HTMLDivElement>ui.errorPane.querySelector(".status");
ui.errorPaneInfo = <HTMLDivElement>ui.errorPaneStatus.querySelector(".info");
ui.errorsTBody = <HTMLTableSectionElement>ui.errorPane.querySelector(".errors tbody");

let errorPaneResizeHandle = new PerfectResize(ui.errorPane, "bottom");
errorPaneResizeHandle.handleElt.classList.add("disabled");

let errorPaneToggleButton = ui.errorPane.querySelector("button.toggle");

ui.errorPaneStatus.addEventListener("click", () => {
  let collapsed = ui.errorPane.classList.toggle("collapsed");
  errorPaneToggleButton.textContent = collapsed ? "+" : "–";
  errorPaneResizeHandle.handleElt.classList.toggle("disabled", collapsed);
});

function onModelFileSelectChange(event: any) {
  if (event.target.files.length === 0) return;

  ui.errorsTBody.innerHTML = "";

  importModel(event.target.files, (log, data) => {
    event.target.parentElement.reset();

    let errorsCount = 0;
    let warningsCount = 0;
    let lastErrorRow: HTMLTableRowElement = null;

    if (log == null) log = [];
    for (let entry of log) {
      // console.log(entry.file, entry.line, entry.type, entry.message);

      let logRow = document.createElement("tr");

      let positionCell = document.createElement("td");
      positionCell.textContent = (entry.line != null) ? (entry.line + 1).toString() : "";
      logRow.appendChild(positionCell);

      let typeCell = document.createElement("td");
      typeCell.textContent = entry.type;
      logRow.appendChild(typeCell);

      let messageCell = document.createElement("td");
      messageCell.textContent = entry.message;
      logRow.appendChild(messageCell);

      let fileCell = document.createElement("td");
      fileCell.textContent = entry.file;
      logRow.appendChild(fileCell);

      if (entry.type === "warning") warningsCount++;

      if (entry.type !== "error") {
        ui.errorsTBody.appendChild(logRow);
        continue;
      }

      ui.errorsTBody.insertBefore(logRow, (lastErrorRow != null) ? lastErrorRow.nextElementSibling : ui.errorsTBody.firstChild);
      lastErrorRow = logRow;
      errorsCount++;
    }

    let errorsAndWarningsInfo: string[] = [];
    if (errorsCount > 1) errorsAndWarningsInfo.push(`${errorsCount} errors`);
    else if (errorsCount > 0) errorsAndWarningsInfo.push(`1 error`);
    else errorsAndWarningsInfo.push("No errors");

    if (warningsCount > 1) errorsAndWarningsInfo.push(`${warningsCount} warnings`);
    else if (warningsCount > 0) errorsAndWarningsInfo.push(`${warningsCount} warnings`);

    if (data == null || errorsCount > 0) {
      let info = (data == null) ? `Import failed — ` : "";
      ui.errorPaneInfo.textContent = info + errorsAndWarningsInfo.join(", ");
      ui.errorPaneStatus.classList.add("has-errors");
      return;
    }

    ui.errorPaneInfo.textContent = errorsAndWarningsInfo.join(", ");
    ui.errorPaneStatus.classList.remove("has-errors");

    editAsset("setModel", data.upAxisMatrix, data.attributes, data.bones);

    if (data.maps != null) editAsset("setMaps", data.maps);
  });
}

function onPrimaryMapFileSelectChange(event: Event) {
  ui.errorsTBody.innerHTML = "";
  ui.errorPaneInfo.textContent = "No errors";
  ui.errorPaneStatus.classList.remove("has-errors");

  let reader = new FileReader;
  reader.onload = (event) => { editAsset("setMaps", { map: reader.result }); };

  let element = <HTMLInputElement>event.target;
  reader.readAsArrayBuffer(element.files[0]);
  (<HTMLFormElement>element.parentElement).reset();
  return
}

function onShowSkeletonChange(event: Event) { data.modelUpdater.modelRenderer.setShowSkeleton((<HTMLInputElement>event.target).checked); }
function onCheckOpacity(event: any) { editAsset("setProperty", "opacity", (event.target.checked) ? 1 : null); }
function onChangeOpacity(event: any) { editAsset("setProperty", "opacity", parseFloat(event.target.value)); }
function onCheckAdvancedTextures(event: any) { editAsset("setProperty", "advancedTextures", event.target.checked); }

function onNewAnimationClick() {
  SupClient.dialogs.prompt("Enter a name for the animation.", null, "Animation", "Create", (name) => {
    if (name == null) return;

    editAsset("newAnimation", name, null, null, (err: string, animationId: string) => {
      ui.animationsTreeView.clearSelection();
      ui.animationsTreeView.addToSelection(ui.animationsTreeView.treeRoot.querySelector(`li[data-id="${animationId}"]`));
      updateSelectedAnimation();
    });
  });
}

function onAnimationFileSelectChange(event: any) {
  if(event.target.files.length === 0) return;

  let animationId: string = ui.selectedAnimationId;

  importModel(event.target.files, (log, data) => {
    event.target.parentElement.reset();

    for(let entry in log) {
      console.log(entry.file, entry.line, entry.type, entry.message);
    }

    if (data == null) { alert("Import failed. See console for details."); return; }
    if (data.animation == null) { alert("No animation found in imported files"); return; }

    // TODO: Check if bones are compatible

    editAsset("setAnimation", animationId, data.animation.duration, data.animation.keyFrames);
  });
}

function onRenameAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.animationsTreeView.selectedNodes[0];
  let animation = data.modelUpdater.modelAsset.animations.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new name for the animation.", null, animation.name, "Rename", (newName) => {
    if (newName == null) return;

    editAsset("setAnimationProperty", animation.id, "name", newName);
  });
}

function onDeleteAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length === 0) return;

  SupClient.dialogs.confirm("Are you sure you want to delete the selected animations?", "Delete", (confirm) => {
    if (!confirm) return;

    for (let selectedNode of ui.animationsTreeView.selectedNodes) editAsset("deleteAnimation", selectedNode.dataset.id);
  });
}

function onAnimationDrop(dropInfo: any, orderedNodes: HTMLLIElement[]) {
  let animationIds: string[] = [];
  for (let animation of orderedNodes) animationIds.push((<any>animation.dataset).id);

  let index = SupClient.getListViewDropIndex(dropInfo, data.modelUpdater.modelAsset.animations);
  for (let i = 0; i < animationIds.length; i++) editAsset("moveAnimation", animationIds[i], index + i);

  return false;
}

export function updateSelectedAnimation() {
  let selectedAnimElt = ui.animationsTreeView.selectedNodes[0]
  if (selectedAnimElt != null) ui.selectedAnimationId = selectedAnimElt.dataset.id;
  else ui.selectedAnimationId = null;

  let buttons = document.querySelectorAll(".animations-buttons button");
  for (let i = 0; i < buttons.length; i++) {
    let button = <HTMLButtonElement>buttons[i];
    button.disabled = ui.selectedAnimationId == null && button.className !== "new-animation";
  }

  data.modelUpdater.config_setProperty("animationId", ui.selectedAnimationId);
}

export function setupAnimation(animation: any, index: number) {
  let liElt = document.createElement("li");
  (<any>liElt.dataset).id = animation.id;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = animation.name;
  liElt.appendChild(nameSpan);

  ui.animationsTreeView.insertAt(liElt, "item", index, null);
}

function onEditMapSlot(event: any) {
  if (event.target.value !== "" && data.modelUpdater.modelAsset.pub.maps[event.target.value] == null) return;
  let slot = event.target.value !== "" ? event.target.value : null;
  editAsset("setMapSlot", event.target.dataset.name, slot)
}

function onNewMapClick() {
  SupClient.dialogs.prompt("Enter a new name for the map.", null, "map", "Create", (name) => {
    if (name == null) return;

    editAsset("newMap", name);
  });
}

function onMapFileSelectChange(event: any) {
  ui.errorsTBody.innerHTML = "";
  ui.errorPaneInfo.textContent = "No errors";
  ui.errorPaneStatus.classList.remove("has-errors");

  let reader = new FileReader;
  let maps: any = {};
  reader.onload = (event) => {
    maps[ui.selectedTextureName] = reader.result;
    editAsset("setMaps", maps);
  };

  let element = <HTMLInputElement>event.target;
  reader.readAsArrayBuffer(element.files[0]);
  (<HTMLFormElement>element.parentElement).reset();
  return
}

function onRenameMapClick() {
  if (ui.texturesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.texturesTreeView.selectedNodes[0];
  let textureName = selectedNode.dataset.name;

  SupClient.dialogs.prompt("Enter a new name for the texture.", null, textureName, "Rename", (newName) => {
    if (newName == null) return;

    editAsset("renameMap", textureName, newName);
  });
}

function onDeleteMapClick() {
  if (ui.texturesTreeView.selectedNodes.length === 0) return;

  SupClient.dialogs.confirm("Are you sure you want to delete the selected textures?", "Delete", (confirm) => {
    if (!confirm) return;

    for (let selectedNode of ui.texturesTreeView.selectedNodes) editAsset("deleteMap", selectedNode.dataset.name);
  });
}

export function updateSelectedMap() {
  let selectedMapElt = ui.texturesTreeView.selectedNodes[0]
  if (selectedMapElt != null) ui.selectedTextureName = selectedMapElt.dataset.name;
  else ui.selectedTextureName = null;

  let buttons = document.querySelectorAll(".textures-buttons button");
  for (let i = 0; i < buttons.length; i++) {
    let button = <HTMLButtonElement>buttons[i];
    button.disabled = ui.selectedTextureName == null && button.className !== "new-map";
  }
}

export function setupMap(mapName: string) {
  let liElt = document.createElement("li");
  (<any>liElt.dataset).name = mapName;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = mapName;
  liElt.appendChild(nameSpan);

  ui.texturesTreeView.insertAt(liElt, "item", 0, null);
}

export function setupOpacity(opacity: number) {
  ui.opacityInput.value = opacity != null ? opacity.toString() : "";
  ui.opacityInput.disabled = opacity == null;
  ui.opacityCheckbox.checked = opacity != null;
}

export function setupAdvancedTextures(advancedTextures: boolean) {
  ui.mapUploadButton.disabled = advancedTextures;
  ui.texturesCheckbox.checked = advancedTextures;
  ui.texturesPane.style.display = advancedTextures ? "flex" : "none";
}
