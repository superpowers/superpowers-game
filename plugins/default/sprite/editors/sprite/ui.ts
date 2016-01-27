import { data } from "./network";
import animationArea from "./animationArea";
import spritesheetArea, { updateSelection } from "./spritesheetArea";

import SpriteAsset from "../../data/SpriteAsset";

import * as ResizeHandle from "resize-handle";
import * as TreeView from "dnd-tree-view";

const ui: {
  allSettings: string[];
  settings: { [name: string]: any; };
  opacitySelect: HTMLSelectElement;
  opacitySlider: HTMLInputElement;

  imageSize: HTMLInputElement;

  animationsTreeView: TreeView;
  selectedAnimationId: string;
  animationPlay: HTMLButtonElement;
  animationSlider: HTMLInputElement;

  texturesPane: HTMLDivElement;
  texturesToogleButton: HTMLInputElement;
  texturesTreeView: TreeView;
  selectedTextureName: string;

  mapSlotsInput: { [name: string]: HTMLInputElement };
} = {} as any;
export default ui;

// Setup hotkeys
SupClient.setupHotkeys();

// Setup resizable panes
new ResizeHandle(document.querySelector(".sidebar") as HTMLElement, "right");

// Setup properties
let fileSelect = <HTMLInputElement>document.querySelector("input.file-select");
fileSelect.addEventListener("change", onFileSelectChange);
document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

document.querySelector("button.download").addEventListener("click", () => {
  let textureName = data.spriteUpdater.spriteAsset.pub.mapSlots["map"];
  downloadTexture(textureName);
});

ui.allSettings = [
  "filtering", "wrapping", "pixelsPerUnit", "framesPerSecond", "opacity", "alphaTest",
  "frameOrder", "grid.width", "grid.height", "origin.x", "origin.y" ];
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
    case "wrapping":
    case "frameOrder":
      settingObj.addEventListener("change", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", setting, event.target.value); });
      break;

    case "opacity":
    case "alphaTest":
      settingObj.addEventListener("input", (event: any) => {
        let value = parseFloat(event.target.value);
        if (isNaN(value)) return;
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", setting, value);
      });
      break;

    default:
      if (setting.indexOf("origin") !== -1)
        settingObj.addEventListener("change", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", setting, event.target.value / 100); });
      else
        settingObj.addEventListener("change", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", setting, parseInt(event.target.value, 10)); });
      break;
  }
});
ui.opacitySelect = <HTMLSelectElement>document.querySelector(".opacity-select");
ui.opacitySelect.addEventListener("change", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", "opacity", event.target.value === "transparent" ? 1 : null); });
ui.opacitySlider = <HTMLInputElement>document.querySelector(".opacity-slider");
ui.opacitySlider.addEventListener("input", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", "opacity", parseFloat(event.target.value)); });
document.querySelector("button.set-grid-size").addEventListener("click", onSetGridSize);

ui.imageSize = <HTMLInputElement>document.querySelector("td.image-size input");

// Animations
ui.animationsTreeView = new TreeView(document.querySelector(".animations-tree-view") as HTMLElement, { dragStartCallback: () => true, dropCallback: onAnimationsTreeViewDrop });
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
SupClient.setupCollapsablePane(ui.texturesPane);

ui.texturesTreeView = new TreeView(document.querySelector(".textures-tree-view") as HTMLElement);
ui.texturesTreeView.on("selectionChange", updateSelectedMap);

ui.mapSlotsInput = {};
for (let slotName in SpriteAsset.schema["mapSlots"].properties) {
  ui.mapSlotsInput[slotName] = <HTMLInputElement>document.querySelector(`.map-${slotName}`);
  ui.mapSlotsInput[slotName].dataset["name"] = slotName;
  ui.mapSlotsInput[slotName].addEventListener("input", onEditMapSlot);
}

document.querySelector("button.new-map").addEventListener("click", onNewMapClick);
let mapFileSelect = <HTMLInputElement>document.querySelector(".upload-map.file-select");
mapFileSelect.addEventListener("change", onMapFileSelectChange);
document.querySelector("button.upload-map").addEventListener("click", () => { mapFileSelect.click(); });
document.querySelector("button.download-map").addEventListener("click", () => {
  if (ui.texturesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.texturesTreeView.selectedNodes[0];
  let textureName = selectedNode.dataset["name"];

  downloadTexture(textureName);
});
document.querySelector("button.rename-map").addEventListener("click", onRenameMapClick);
document.querySelector("button.delete-map").addEventListener("click", onDeleteMapClick);

function onFileSelectChange(event: any) {
  if (event.target.files.length === 0) return;

  let reader = new FileReader();
  reader.onload = (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setMaps", { map: event.target.result }); };

  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

function downloadTexture(textureName: string) {
  function triggerDownload(name: string) {
    let anchor = document.createElement("a");
    document.body.appendChild(anchor);
    anchor.style.display = "none";
    anchor.href = data.spriteUpdater.spriteAsset.mapObjectURLs[textureName];

    // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
    (anchor as any).download = `${name}.png`;
    anchor.click();
    document.body.removeChild(anchor);
  }

  let options = {
    initialValue: SupClient.i18n.t("spriteEditor:sidebar.settings.sprite.texture.download.defaultName"),
    validationLabel: SupClient.i18n.t("common:actions.download")
  };

  if (SupClient.isApp) {
    triggerDownload(options.initialValue);
  } else {
    /* tslint:disable:no-unused-expression */
    new SupClient.dialogs.PromptDialog(SupClient.i18n.t("spriteEditor:sidebar.settings.sprite.texture.download.prompt"), options, (name) => {
      /* tslint:enable:no-unused-expression */
      if (name == null) return;
      triggerDownload(name);
    });
  }
}

function onSetGridSize(event: any) {
  let texture = data.spriteUpdater.spriteAsset.pub.textures["map"];
  if (texture == null) return;

  // TODO: Replace with a single popup
  let options = {
    initialValue: "1",
    validationLabel: SupClient.i18n.t("spriteEditor:sidebar.settings.sprite.grid.setWidth"),
    cancelLabel: SupClient.i18n.t("common:actions.skip")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("spriteEditor:sidebar.settings.sprite.grid.widthPrompt"), options, (framesPerRow) => {
    /* tslint:enable:no-unused-expression */
    if (framesPerRow != null) {
      let framesPerRowNum = parseInt(framesPerRow, 10);
      if (isNaN(framesPerRowNum)) return;

      data.projectClient.editAsset(SupClient.query.asset, "setProperty", "grid.width", Math.floor(texture.size.width / framesPerRowNum));
    }

    options.validationLabel = SupClient.i18n.t("spriteEditor:sidebar.settings.sprite.grid.setHeight");

    /* tslint:disable:no-unused-expression */
    new SupClient.dialogs.PromptDialog(SupClient.i18n.t("spriteEditor:sidebar.settings.sprite.grid.heightPrompt"), options, (framesPerColumn) => {
      /* tslint:enable:no-unused-expression */
      if (framesPerColumn != null) {
        let framesPerColumnNum = parseInt(framesPerColumn, 10);
        if (isNaN(framesPerColumnNum)) return;

        data.projectClient.editAsset(SupClient.query.asset, "setProperty", "grid.height", Math.floor(texture.size.height / framesPerColumnNum));
      }
    });
  });
}

function onNewAnimationClick() {
  let options = {
    initialValue: "Animation",
    validationLabel: SupClient.i18n.t("common:actions.create")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("spriteEditor:sidebar.animations.newAnimationPrompt"), options, (name) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;

    data.projectClient.editAsset(SupClient.query.asset, "newAnimation", name, (animationId: string) => {
      ui.animationsTreeView.clearSelection();
      ui.animationsTreeView.addToSelection(ui.animationsTreeView.treeRoot.querySelector(`li[data-id='${animationId}']`) as HTMLLIElement);
      updateSelectedAnimation();
    });
  });
}

function onRenameAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.animationsTreeView.selectedNodes[0];
  let animation = data.spriteUpdater.spriteAsset.animations.byId[selectedNode.dataset["id"]];

  let options = {
    initialValue: animation.name,
    validationLabel: SupClient.i18n.t("common:actions.rename")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("spriteEditor:sidebar.animations.renameAnimationPrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;

    data.projectClient.editAsset(SupClient.query.asset, "setAnimationProperty", animation.id, "name", newName);
  });
}

function onDeleteAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length === 0) return;

  let confirmLabel = SupClient.i18n.t("spriteEditor:sidebar.animations.deleteAnimationPrompt");
  let validationLabel = SupClient.i18n.t("common:actions.delete");
  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
    /* tslint:enable:no-unused-expression */
    if (!confirm) return;

    ui.animationsTreeView.selectedNodes.forEach((selectedNode: any) => { data.projectClient.editAsset(SupClient.query.asset, "deleteAnimation", selectedNode.dataset["id"]); });
  });
}

function onAnimationsTreeViewDrop(event: DragEvent, dropLocation: TreeView.DropLocation, orderedNodes: HTMLLIElement[]) {
  let animationIds: number[] = [];
  orderedNodes.forEach((animation: any) => { animationIds.push(animation.dataset["id"]); });

  let index = SupClient.getListViewDropIndex(dropLocation, data.spriteUpdater.spriteAsset.animations);

  animationIds.forEach((id, i) => { data.projectClient.editAsset(SupClient.query.asset, "moveAnimation", id, index + i); });
  return false;
}

export function updateSelectedAnimation() {
  let selectedAnimElt = ui.animationsTreeView.selectedNodes[0];
  if (selectedAnimElt != null) {
    ui.selectedAnimationId = selectedAnimElt.dataset["id"];
    data.spriteUpdater.config_setProperty("animationId", ui.selectedAnimationId);
    ui.animationPlay.disabled = false;
    ui.animationSlider.disabled = false;
    ui.animationSlider.max = (data.spriteUpdater.spriteRenderer.getAnimationFrameCount() - 1).toString();
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
  data.spriteUpdater.spriteRenderer.setAnimationFrameTime(parseInt(ui.animationSlider.value, 10));
}

export function setupProperty(path: string, value: any) {
  let parts = path.split(".");
  let obj = ui.settings;
  parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; });
  if (path.indexOf("origin") !== -1) value *= 100;
  obj[parts[parts.length - 1]].value = value;

  let pub = data.spriteUpdater.spriteAsset.pub;

  if (path === "filtering" && spritesheetArea.spriteRenderer.asset != null) {
    if (value === "pixelated") {
      spritesheetArea.spritesheet.textures["map"].magFilter = SupEngine.THREE.NearestFilter;
      spritesheetArea.spritesheet.textures["map"].minFilter = SupEngine.THREE.NearestFilter;
    } else {
      spritesheetArea.spritesheet.textures["map"].magFilter = SupEngine.THREE.LinearFilter;
      spritesheetArea.spritesheet.textures["map"].minFilter = SupEngine.THREE.LinearMipMapLinearFilter;
    }
    spritesheetArea.spritesheet.textures["map"].needsUpdate = true;
  }
  if (path === "wrapping" && spritesheetArea.spriteRenderer.asset != null) {
    if (value === "clampToEdge") {
      spritesheetArea.spritesheet.textures["map"].wrapS = SupEngine.THREE.ClampToEdgeWrapping;
      spritesheetArea.spritesheet.textures["map"].wrapT = SupEngine.THREE.ClampToEdgeWrapping;
    } else if (value === "repeat") {
      spritesheetArea.spritesheet.textures["map"].wrapS = SupEngine.THREE.RepeatWrapping;
      spritesheetArea.spritesheet.textures["map"].wrapT = SupEngine.THREE.RepeatWrapping;
    } else if (value === "mirroredRepeat") {
      spritesheetArea.spritesheet.textures["map"].wrapS = SupEngine.THREE.MirroredRepeatWrapping;
      spritesheetArea.spritesheet.textures["map"].wrapT = SupEngine.THREE.MirroredRepeatWrapping;
    }
    spritesheetArea.spritesheet.textures["map"].needsUpdate = true;
  }

  if (path === "opacity") {
    if (value == null) {
      ui.opacitySelect.value = "opaque";
      ui.opacitySlider.parentElement.hidden = true;
      spritesheetArea.spriteRenderer.setOpacity(null);
    } else {
      ui.opacitySelect.value = "transparent";
      ui.opacitySlider.parentElement.hidden = false;
      ui.opacitySlider.value = value;
      spritesheetArea.spriteRenderer.setOpacity(1);
    }
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
      spritesheetArea.gridRenderer.resize(texture.size.width / pub.grid.width, texture.size.height / pub.grid.height);
    }
    updateSelection();
  }

  if (path === "frameOrder") updateSelection();
}

export function setupAnimation(animation: any, index: number) {
  let liElt = document.createElement("li");
  liElt.dataset["id"] = animation.id;

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
    let startFrameIndex = parseInt(event.target.value, 10);
    data.projectClient.editAsset(SupClient.query.asset, "setAnimationProperty", animation.id, "startFrameIndex", startFrameIndex);

    if (startFrameIndex > data.spriteUpdater.spriteAsset.animations.byId[ui.selectedAnimationId].endFrameIndex)
      data.projectClient.editAsset(SupClient.query.asset, "setAnimationProperty", animation.id, "endFrameIndex", startFrameIndex);
  });

  let endFrameIndexInput = document.createElement("input");
  endFrameIndexInput.type = "number";
  endFrameIndexInput.min = "0";
  endFrameIndexInput.className = "end-frame-index";
  endFrameIndexInput.value = animation.endFrameIndex;
  liElt.appendChild(endFrameIndexInput);

  endFrameIndexInput.addEventListener("change", (event: any) => {
    let endFrameIndex = parseInt(event.target.value, 10);
    data.projectClient.editAsset(SupClient.query.asset, "setAnimationProperty", animation.id, "endFrameIndex", endFrameIndex);

    if (endFrameIndex < data.spriteUpdater.spriteAsset.animations.byId[ui.selectedAnimationId].startFrameIndex)
      data.projectClient.editAsset(SupClient.query.asset, "setAnimationProperty", animation.id, "startFrameIndex", endFrameIndex);
  });

  let speedInput = document.createElement("input");
  speedInput.type = "number";
  speedInput.className = "speed";
  speedInput.value = animation.speed;
  liElt.appendChild(speedInput);

  speedInput.addEventListener("change", (event: any) => {
    data.projectClient.editAsset(SupClient.query.asset, "setAnimationProperty", animation.id, "speed", parseFloat(event.target.value));
  });

  ui.animationsTreeView.insertAt(liElt, "item", index, null);
}

function onEditMapSlot(event: any) {
  if (event.target.value !== "" && data.spriteUpdater.spriteAsset.pub.maps[event.target.value] == null) return;
  let slot = event.target.value !== "" ? event.target.value : null;
  data.projectClient.editAsset(SupClient.query.asset, "setMapSlot", event.target.dataset["name"], slot);
}

function onNewMapClick() {
  let options = {
    initialValue: "map",
    validationLabel: SupClient.i18n.t("common:actions.create")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("spriteEditor:sidebar.advancedTextures.newMapPrompt"), options, (name) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;

    data.projectClient.editAsset(SupClient.query.asset, "newMap", name);
  });
}

function onMapFileSelectChange(event: any) {
  let reader = new FileReader;
  let maps: any = {};
  reader.onload = (event) => {
    maps[ui.selectedTextureName] = reader.result;
    data.projectClient.editAsset(SupClient.query.asset, "setMaps", maps);
  };

  let element = <HTMLInputElement>event.target;
  reader.readAsArrayBuffer(element.files[0]);
  (<HTMLFormElement>element.parentElement).reset();
  return;
}

function onRenameMapClick() {
  if (ui.texturesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.texturesTreeView.selectedNodes[0];
  let textureName = selectedNode.dataset["name"];

  let options = {
    initialValue: textureName,
    validationLabel: SupClient.i18n.t("common:actions.rename")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("spriteEditor:sidebar.advancedTextures.renameMapPrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;

    data.projectClient.editAsset(SupClient.query.asset, "renameMap", textureName, newName);
  });
}

function onDeleteMapClick() {
  if (ui.texturesTreeView.selectedNodes.length === 0) return;

  let confirmLabel = SupClient.i18n.t("spriteEditor:sidebar.advancedTextures.deleteMapPrompt");
  let validationLabel = SupClient.i18n.t("common:actions.delete");
  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
    /* tslint:enable:no-unused-expression */
    if (!confirm) return;

    for (let selectedNode of ui.texturesTreeView.selectedNodes) data.projectClient.editAsset(SupClient.query.asset, "deleteMap", selectedNode.dataset["name"]);
  });
}

export function updateSelectedMap() {
  let selectedMapElt = ui.texturesTreeView.selectedNodes[0];
  if (selectedMapElt != null) ui.selectedTextureName = selectedMapElt.dataset["name"];
  else ui.selectedTextureName = null;

  let buttons = document.querySelectorAll(".textures-buttons button");
  for (let i = 0; i < buttons.length; i++) {
    let button = <HTMLButtonElement>buttons[i];
    button.disabled = ui.selectedTextureName == null && button.className !== "new-map";
  }
}

export function setupMap(mapName: string) {
  let liElt = document.createElement("li");
  liElt.dataset["name"] = mapName;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = mapName;
  liElt.appendChild(nameSpan);

  ui.texturesTreeView.insertAt(liElt, "item", 0, null);
}
