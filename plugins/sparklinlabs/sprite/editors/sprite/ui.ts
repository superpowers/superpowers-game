import info from "./info";
import { socket, data } from "./network";
import animationArea from "./animationArea";
import spritesheetArea, { updateSelection } from "./spritesheetArea";

let TreeView = require("dnd-tree-view");

let ui: {
  allSettings?: string[];
  settings?: { [name: string]: any; };
  opacityCheckbox?: HTMLInputElement;

  imageLabel?: { width: HTMLLabelElement; height: HTMLLabelElement; };

  animationsTreeView?: any;
  selectedAnimationId?: string;
  animationPlay?: HTMLButtonElement;
  animationSlider?: HTMLInputElement;
} = {};
export default ui;

SupClient.setupHotkeys();

let fileSelect = <HTMLInputElement>document.querySelector("input.file-select");
fileSelect.addEventListener("change", onFileSelectChange);
document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

document.querySelector("button.download").addEventListener("click", onDownloadSpritesheet);

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
      settingObj.addEventListener("change", (event: any) => {
        socket.emit("edit:assets", info.assetId, "setProperty", setting, event.target.value, (err: string) => { if (err != null) alert(err); });
      });
      break;

    case "opacity":
    case "alphaTest":
      settingObj.addEventListener("change", (event: any) => {
        socket.emit("edit:assets", info.assetId, "setProperty", setting, parseFloat(event.target.value), (err: string) => { if (err != null) alert(err); });
      });
      break;

    default:
      if (setting.indexOf("origin") !== -1) {
        settingObj.addEventListener("change", (event: any) => {
          socket.emit("edit:assets", info.assetId, "setProperty", setting, event.target.value / 100, (err: string) => { if (err != null) alert(err); });
        });
      } else {
        settingObj.addEventListener("change", (event: any) => {
          socket.emit("edit:assets", info.assetId, "setProperty", setting, parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
        });
      }
  }
});
ui.opacityCheckbox = <HTMLInputElement>document.querySelector("input.opacity-checkbox");
ui.opacityCheckbox.addEventListener("click", onCheckOpacity);
document.querySelector("button.set-grid-width").addEventListener("click", onSetGridWidth);
document.querySelector("button.set-grid-height").addEventListener("click", onSetGridHeight);

ui.imageLabel = {
  width: <HTMLLabelElement>document.querySelector("label.image-width"),
  height: <HTMLLabelElement>document.querySelector("label.image-height")
}

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

function onFileSelectChange(event: any) {
  if (event.target.files.length === 0) return;

  let reader = new FileReader();
  reader.onload = (event: any) => {
    socket.emit("edit:assets", info.assetId, "upload", event.target.result, (err: string) => {
      if (err != null) alert(err);
    });
  };

  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

function onDownloadSpritesheet(event: any) {
  SupClient.dialogs.prompt("Enter a name for the image.", null, "Image", "Download", (name) => {
    if (name == null) return;

    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = data.spriteUpdater.url;

    (<any>a).download = name + ".png";
    a.click();
    document.body.removeChild(a);
  });
}

function onCheckOpacity(event: any) {
  let opacity = (event.target.checked) ? 1 : null;
  socket.emit("edit:assets", info.assetId, "setProperty", "opacity", opacity, (err: string) => {
    if (err != null) alert(err);
  });
}

function onSetGridWidth(event: any) {
  let texture = data.spriteUpdater.spriteAsset.pub.textures["map"];
  if (texture == null) return;

  SupClient.dialogs.prompt("How many frames per row?", null, "1", "Set grid width", (framesPerRow) => {
    if (framesPerRow == null) return;

    let framesPerRowNum = parseInt(framesPerRow);
    if (isNaN(framesPerRowNum)) return;

    socket.emit("edit:assets", info.assetId, "setProperty", "grid.width", Math.floor(texture.image.width / framesPerRowNum), (err: string) => {
      if (err != null) alert(err);
    });
  });
}

function onSetGridHeight(event: any) {
  let texture = data.spriteUpdater.spriteAsset.pub.textures["map"];
  if (texture == null) return;

  SupClient.dialogs.prompt("How many frames per column?", null, "1", "Set grid height", (framesPerColumn) => {
    if (framesPerColumn == null) return;

    let framesPerColumnNum = parseInt(framesPerColumn);
    if (isNaN(framesPerColumnNum)) return;

    socket.emit("edit:assets", info.assetId, "setProperty", "grid.height", Math.floor(texture.image.height / framesPerColumnNum), (err: string) => {
      if (err != null) alert(err);
    });
  });
}

function onNewAnimationClick() {
  SupClient.dialogs.prompt("Enter a name for the animation.", null, "Animation", "Create", (name) => {
    if (name == null) return;

    socket.emit("edit:assets", info.assetId, "newAnimation", name, (err: string, animationId: string) => {
      if (err != null) { alert(err); return; }

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

    socket.emit("edit:assets", info.assetId, "setAnimationProperty", animation.id, "name", newName, (err: string) => {
      if (err != null) alert(err);
    });
  });
}

function onDeleteAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length === 0) return;
  SupClient.dialogs.confirm("Are you sure you want to delete the selected animations?", "Delete", (confirm) => {
    if (! confirm) return;

    ui.animationsTreeView.selectedNodes.forEach((selectedNode: any) => {
      socket.emit("edit:assets", info.assetId, "deleteAnimation", selectedNode.dataset.id, (err: string) => {
        if (err != null) alert(err);
      });
    });
  });
}

function onAnimationDrop(dropInfo: any, orderedNodes: any[]) {
  let animationIds: number[] = [];
  orderedNodes.forEach((animation: any) => { animationIds.push(animation.dataset.id); });

  let index = SupClient.getListViewDropIndex(dropInfo, data.spriteUpdater.spriteAsset.animations);

  animationIds.forEach((id, i) => {
    socket.emit("edit:assets", info.assetId, "moveAnimation", id, index + i, (err: string) => {
      if (err != null) alert(err);
    });
  })
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
    spritesheetArea.gridRenderer.resize(pub.textures["map"].image.width / pub.grid.width, pub.textures["map"].image.height / pub.grid.height);
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
  startFrameIndexInput.className = "start-frame-index";
  startFrameIndexInput.value = animation.startFrameIndex;
  liElt.appendChild(startFrameIndexInput);

  startFrameIndexInput.addEventListener("change", (event: any) => {
    socket.emit("edit:assets", info.assetId, "setAnimationProperty", animation.id, "startFrameIndex", parseInt(event.target.value), (err: string) => {
      if (err != null) alert(err);
    });
  });

  let endFrameIndexInput = document.createElement("input")
  endFrameIndexInput.type = "number"
  endFrameIndexInput.className = "end-frame-index"
  endFrameIndexInput.value = animation.endFrameIndex
  liElt.appendChild(endFrameIndexInput);

  endFrameIndexInput.addEventListener("change", (event: any) => {
    socket.emit("edit:assets", info.assetId, "setAnimationProperty", animation.id, "endFrameIndex", parseInt(event.target.value), (err: string) => {
      if (err != null) alert(err);
    });
  });

  ui.animationsTreeView.insertAt(liElt, "item", index, null);
}
