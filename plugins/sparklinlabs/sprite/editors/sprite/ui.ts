import info from "./info";
import { data, editAsset } from "./network";
import animationArea from "./animationArea";
import spritesheetArea, { updateSelection } from "./spritesheetArea";

import SpriteAsset from "../../data/SpriteAsset";

let PerfectResize = require("perfect-resize");
let TreeView = require("dnd-tree-view");

let ui: {
  allSettings?: string[];
  settings?: { [name: string]: any; };
  opacityCheckbox?: HTMLInputElement;

  imageLabel?: HTMLTableDataCellElement;

  animationsTreeView?: any;
  selectedAnimationId?: string;
  animationPlay?: HTMLButtonElement;
  animationSlider?: HTMLInputElement;

  texturesPane?: HTMLDivElement;
  texturesToogleButton?: HTMLInputElement;
  texturesTreeView?: any;
  selectedTextureName?: string;

  mapSlotsInput?: { [name: string]: HTMLInputElement };
} = {};
export default ui;

SupClient.setupHotkeys();

let fileSelect = <HTMLInputElement>document.querySelector("input.file-select");
fileSelect.addEventListener("change", onFileSelectChange);
document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

document.querySelector("button.download").addEventListener("click", () => {
  let textureName = data.spriteUpdater.spriteAsset.pub.mapSlots["map"];
  downloadTexture(textureName);
});

ui.allSettings = ["filtering", "pixelsPerUnit", "framesPerSecond", "opacity", "alphaTest", "frameOrder", "grid.width", "grid.height", "origin.x", "origin.y"]
ui.settings = {};
ui.allSettings.forEach((setting: string) => {
  let parts = setting.split(".");

  let obj = ui.settings;
  let queryName = ".property-";

  parts.slice(0, parts.length - 1).forEach((part) => {
    if (obj[part] == null) obj[part] = {};
    obj = obj[part];
    queryName += `${part}-`;
  });

  queryName += parts[parts.length - 1];
  let settingObj = obj[parts[parts.length - 1]] = document.querySelector(queryName);

  switch (setting) {
    case "filtering":
    case "frameOrder":
      settingObj.addEventListener("change", (event: any) => { editAsset("setProperty", setting, event.target.value); });
      break;

    case "opacity":
    case "alphaTest":
      settingObj.addEventListener("change", (event: any) => { editAsset("setProperty", setting, parseFloat(event.target.value)); });
      break;

    default:
      if (setting.indexOf("origin") !== -1)
        settingObj.addEventListener("change", (event: any) => { editAsset("setProperty", setting, event.target.value / 100); });
      else
        settingObj.addEventListener("change", (event: any) => { editAsset("setProperty", setting, parseInt(event.target.value)); });
      break;
  }
});
ui.opacityCheckbox = <HTMLInputElement>document.querySelector("input.opacity-checkbox");
ui.opacityCheckbox.addEventListener("click", onCheckOpacity);
document.querySelector("button.set-grid-width").addEventListener("click", onSetGridWidth);
document.querySelector("button.set-grid-height").addEventListener("click", onSetGridHeight);

ui.imageLabel = <HTMLTableDataCellElement>document.querySelector("td.image-size");

// Animations
ui.animationsTreeView = new TreeView(document.querySelector(".animations-tree-view"), onAnimationDrop);
ui.animationsTreeView.on("selectionChange", updateSelectedAnimation);

document.querySelector("button.new-animation").addEventListener("click", onNewAnimationClick);
document.querySelector("button.rename-animation").addEventListener("click", onRenameAnimationClick);
document.querySelector("button.delete-animation").addEventListener("click", onDeleteAnimationClick);

ui.animationPlay = <HTMLButtonElement>document.querySelector("button.animation-play");
ui.animationPlay.addEventListener("click", onPlayAnimation);

ui.animationSlider = <HTMLInputElement>document.querySelector("input.animation-slider");
ui.animationSlider.addEventListener("input", onChangeAnimationTime);

document.querySelector("input.animation-loop").addEventListener("change", (event: any) => {
  data.spriteUpdater.config_setProperty("looping", event.target.checked);
});

// Advanced textures
ui.texturesPane = <HTMLDivElement>document.querySelector(".advanced-textures");
let texturePaneResizeHandle = new PerfectResize(ui.texturesPane, "bottom");

ui.texturesToogleButton = <HTMLInputElement>document.querySelector(".advanced-textures button.plus");
ui.texturesToogleButton.addEventListener("click", () => {
  let advancedTextures = !data.spriteUpdater.spriteAsset.pub.advancedTextures;
  editAsset("setProperty", "advancedTextures", advancedTextures);
});

ui.texturesTreeView = new TreeView(document.querySelector(".textures-tree-view"));
ui.texturesTreeView.on("selectionChange", updateSelectedMap);

ui.mapSlotsInput = {};
for (let slotName in SpriteAsset.schema.mapSlots.properties) {
  ui.mapSlotsInput[slotName] = <HTMLInputElement>document.querySelector(`.map-${slotName}`);
  (<any>ui.mapSlotsInput[slotName].dataset).name = slotName;
  ui.mapSlotsInput[slotName].addEventListener("input", onEditMapSlot);
}

document.querySelector("button.new-map").addEventListener("click", onNewMapClick);
let mapFileSelect = <HTMLInputElement>document.querySelector(".upload-map.file-select");
mapFileSelect.addEventListener("change", onMapFileSelectChange);
document.querySelector("button.upload-map").addEventListener("click", () => { mapFileSelect.click(); });
document.querySelector("button.download-map").addEventListener("click", () => {
  if (ui.texturesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.texturesTreeView.selectedNodes[0];
  let textureName = selectedNode.dataset.name;

  downloadTexture(textureName);
});
document.querySelector("button.rename-map").addEventListener("click", onRenameMapClick);
document.querySelector("button.delete-map").addEventListener("click", onDeleteMapClick);

function onFileSelectChange(event: any) {
  if (event.target.files.length === 0) return;

  let reader = new FileReader();
  reader.onload = (event: any) => { editAsset("setMaps", { map: event.target.result }); };

  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

function downloadTexture(textureName: string) {
  SupClient.dialogs.prompt("Enter a name for the image.", null, "Image", "Download", (name) => {
    if (name == null) return;

    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = data.spriteUpdater.mapObjectURLs[textureName];

    (<any>a).download = name + ".png";
    a.click();
    document.body.removeChild(a);
  });
}

function onCheckOpacity(event: any) {
  let opacity = (event.target.checked) ? 1 : null;
  editAsset("setProperty", "opacity", opacity);
}

function onSetGridWidth(event: any) {
  let texture = data.spriteUpdater.spriteAsset.pub.textures["map"];
  if (texture == null) return;

  SupClient.dialogs.prompt("How many frames per row?", null, "1", "Set grid width", (framesPerRow) => {
    if (framesPerRow == null) return;

    let framesPerRowNum = parseInt(framesPerRow);
    if (isNaN(framesPerRowNum)) return;

    editAsset("setProperty", "grid.width", Math.floor(texture.image.width / framesPerRowNum));
  });
}

function onSetGridHeight(event: any) {
  let texture = data.spriteUpdater.spriteAsset.pub.textures["map"];
  if (texture == null) return;

  SupClient.dialogs.prompt("How many frames per column?", null, "1", "Set grid height", (framesPerColumn) => {
    if (framesPerColumn == null) return;

    let framesPerColumnNum = parseInt(framesPerColumn);
    if (isNaN(framesPerColumnNum)) return;

    editAsset("setProperty", "grid.height", Math.floor(texture.image.height / framesPerColumnNum));
  });
}

function onNewAnimationClick() {
  SupClient.dialogs.prompt("Enter a name for the animation.", null, "Animation", "Create", (name) => {
    if (name == null) return;

    editAsset("newAnimation", name, (animationId: string) => {
      ui.animationsTreeView.clearSelection();
      ui.animationsTreeView.addToSelection(ui.animationsTreeView.treeRoot.querySelector(`li[data-id='${animationId}']`));
      updateSelectedAnimation();
    });
  });
}

function onRenameAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.animationsTreeView.selectedNodes[0];
  let animation = data.spriteUpdater.spriteAsset.animations.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new name for the animation.", null, animation.name, "Rename", (newName) => {
    if (newName == null) return;

    editAsset("setAnimationProperty", animation.id, "name", newName);
  });
}

function onDeleteAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length === 0) return;
  SupClient.dialogs.confirm("Are you sure you want to delete the selected animations?", "Delete", (confirm) => {
    if (! confirm) return;

    ui.animationsTreeView.selectedNodes.forEach((selectedNode: any) => { editAsset("deleteAnimation", selectedNode.dataset.id); });
  });
}

function onAnimationDrop(dropInfo: any, orderedNodes: any[]) {
  let animationIds: number[] = [];
  orderedNodes.forEach((animation: any) => { animationIds.push(animation.dataset.id); });

  let index = SupClient.getListViewDropIndex(dropInfo, data.spriteUpdater.spriteAsset.animations);

  animationIds.forEach((id, i) => { editAsset("moveAnimation", id, index + i); });
  return false;
}

export function updateSelectedAnimation() {
  let selectedAnimElt = ui.animationsTreeView.selectedNodes[0];
  if (selectedAnimElt != null) {
    ui.selectedAnimationId = selectedAnimElt.dataset.id;
    data.spriteUpdater.config_setProperty("animationId", ui.selectedAnimationId);
    ui.animationPlay.disabled = false;
    ui.animationSlider.disabled = false;

    updateSelection();
  } else {
    ui.selectedAnimationId = null;
    data.spriteUpdater.config_setProperty("animationId", null);
    ui.animationPlay.disabled = true;
    ui.animationSlider.disabled = true;
    ui.animationSlider.value = "0";

    spritesheetArea.selectionRenderer.clearMesh();
  }

  ui.animationPlay.textContent = "▐ ▌";

  let buttons = document.querySelectorAll(".animations-buttons button");
  for (let index = 0; index < buttons.length; index ++) {
    let button: any = buttons.item(index);
    button.disabled = ui.selectedAnimationId == null && button.className !== "new-animation";
  }
}

function onPlayAnimation() {
  if (ui.animationPlay.textContent === "▐ ▌") {
    data.spriteUpdater.spriteRenderer.pauseAnimation();
    ui.animationPlay.textContent = "▶";
  }
  else {
    data.spriteUpdater.spriteRenderer.playAnimation(data.spriteUpdater.looping);
    ui.animationPlay.textContent = "▐ ▌";
  }
}

function onChangeAnimationTime() {
  if (data.spriteUpdater == null) return;
  let animationTime = parseFloat(ui.animationSlider.value) / 100 * data.spriteUpdater.spriteRenderer.getAnimationDuration();
  data.spriteUpdater.spriteRenderer.setAnimationTime(animationTime);
}

export function setupProperty(path: string, value: any) {
  let parts = path.split(".");
  let obj = ui.settings;
  parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; });
  if (path.indexOf("origin") !== -1) value *= 100;
  obj[parts[parts.length - 1]].value = value;

  let pub = data.spriteUpdater.spriteAsset.pub;

  if (path === "filtering" && spritesheetArea.spriteRenderer.asset != null) {
    if (pub.filtering === "pixelated") {
      spritesheetArea.spritesheet.textures["map"].magFilter = SupEngine.THREE.NearestFilter;
      spritesheetArea.spritesheet.textures["map"].minFilter = SupEngine.THREE.NearestFilter;
    } else {
      spritesheetArea.spritesheet.textures["map"].magFilter = SupEngine.THREE.LinearFilter;
      spritesheetArea.spritesheet.textures["map"].minFilter = SupEngine.THREE.LinearMipMapLinearFilter;
    }
    spritesheetArea.spritesheet.textures["map"].needsUpdate = true;
  }

  if (path === "opacity") {
    obj[parts[parts.length - 1]].disabled = value == null;
    ui.opacityCheckbox.checked = value != null;
    spritesheetArea.spriteRenderer.setOpacity(value != null ? 1 : null)
  }

  if (path === "alphaTest" && spritesheetArea.spriteRenderer.material != null) {
    spritesheetArea.spriteRenderer.material.alphaTest = value;
    spritesheetArea.spriteRenderer.material.needsUpdate = true;
  }

  if (path === "pixelsPerUnit") {
    // FIXME: .setPixelsPerUnit(...) maybe?
    spritesheetArea.spritesheet.pixelsPerUnit = value;
    spritesheetArea.spriteRenderer.updateShape();
    spritesheetArea.gridRenderer.setRatio({ x: pub.pixelsPerUnit / pub.grid.width, y: pub.pixelsPerUnit / pub.grid.height });

    spritesheetArea.cameraControls.setMultiplier(value);
    animationArea.cameraControls.setMultiplier(value);
    animationArea.originMakerComponent.setScale(100 / value);
    updateSelection();
  }

  if (path === "grid.width" || path === "grid.height") {
    spritesheetArea.gridRenderer.setRatio({ x: pub.pixelsPerUnit / pub.grid.width, y: pub.pixelsPerUnit / pub.grid.height });
    let texture = pub.textures[pub.mapSlots["map"]];
    if (texture != null) {
      let image = texture.image;
      spritesheetArea.gridRenderer.resize(image.width / pub.grid.width, image.height / pub.grid.height);
    }
    updateSelection();
  }

  if (path === "frameOrder") updateSelection();
}

export function setupAnimation(animation: any, index: number) {
  let liElt = document.createElement("li");
  (<any>liElt.dataset).id = animation.id;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = animation.name;
  liElt.appendChild(nameSpan);

  let startFrameIndexInput = document.createElement("input");
  startFrameIndexInput.type = "number";
  startFrameIndexInput.min = "0";
  startFrameIndexInput.className = "start-frame-index";
  startFrameIndexInput.value = animation.startFrameIndex;
  liElt.appendChild(startFrameIndexInput);

  startFrameIndexInput.addEventListener("change", (event: any) => {
    let startFrameIndex = parseInt(event.target.value);
    editAsset("setAnimationProperty", animation.id, "startFrameIndex", startFrameIndex);
    ui.selectedAnimationId
    if (startFrameIndex > data.spriteUpdater.spriteAsset.animations.byId[ui.selectedAnimationId].endFrameIndex)
      editAsset("setAnimationProperty", animation.id, "endFrameIndex", startFrameIndex);
  });

  let endFrameIndexInput = document.createElement("input");
  endFrameIndexInput.type = "number";
  endFrameIndexInput.min = "0";
  endFrameIndexInput.className = "end-frame-index";
  endFrameIndexInput.value = animation.endFrameIndex;
  liElt.appendChild(endFrameIndexInput);

  endFrameIndexInput.addEventListener("change", (event: any) => {
    let endFrameIndex = parseInt(event.target.value);
    editAsset("setAnimationProperty", animation.id, "endFrameIndex", endFrameIndex);
    ui.selectedAnimationId
    if (endFrameIndex < data.spriteUpdater.spriteAsset.animations.byId[ui.selectedAnimationId].startFrameIndex)
      editAsset("setAnimationProperty", animation.id, "startFrameIndex", endFrameIndex);
  });

  ui.animationsTreeView.insertAt(liElt, "item", index, null);
}

function onEditMapSlot(event: any) {
  if (event.target.value !== "" && data.spriteUpdater.spriteAsset.pub.maps[event.target.value] == null) return;
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

export function setupAdvancedTextures(advancedTextures: boolean) {
  (<any>ui.texturesPane.classList).toggle("collapsed", !advancedTextures);
  ui.texturesToogleButton.textContent = !advancedTextures ? "+" : "–";
  texturePaneResizeHandle.handleElt.classList.toggle("disabled", !advancedTextures);
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