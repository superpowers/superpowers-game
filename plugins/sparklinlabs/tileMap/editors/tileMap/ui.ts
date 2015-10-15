import info from "./info";
import { socket, data } from "./network";
import mapArea, { setupPattern, setupFillPattern, flipTilesVertically, flipTilesHorizontally, rotateTiles } from "./mapArea";
import tileSetArea from "./tileSetArea";

let TreeView = require("dnd-tree-view");
let PerfectResize = require("perfect-resize");

let tmpPosition = new SupEngine.THREE.Vector3();
let tmpScale = new SupEngine.THREE.Vector3();

import { TileMapLayerPub } from "../../data/TileMapLayers";

let ui: {
  tileSetInput?: HTMLInputElement;

  widthLabel?: HTMLLabelElement;
  heightLabel?: HTMLLabelElement;

  settings?: { [name: string]: HTMLInputElement };

  gridCheckbox?: HTMLInputElement;
  highlightCheckbox?: HTMLInputElement;
  highlightSlider?: HTMLInputElement;

  brushToolButton?: HTMLInputElement;
  fillToolButton?: HTMLInputElement;
  selectionToolButton?: HTMLInputElement;
  eraserToolButton?: HTMLInputElement;

  layersTreeView?: any;

  mousePositionLabel?: { x: HTMLLabelElement; y: HTMLLabelElement; };
} = {};
export default ui;

// Setup resize handles
new PerfectResize(document.querySelector(".sidebar"), "right");
new PerfectResize(document.querySelector(".layers"), "bottom");

ui.tileSetInput = <HTMLInputElement>document.querySelector(".property-tileSetId");
ui.tileSetInput.addEventListener("input", onTileSetChange);
ui.tileSetInput.addEventListener("keyup", (event: Event) => { event.stopPropagation(); });

ui.widthLabel = <HTMLLabelElement>document.querySelector(".property-width");
ui.heightLabel = <HTMLLabelElement>document.querySelector(".property-height");
(<HTMLButtonElement>document.querySelector("button.resize")).addEventListener("click", onResizeMapClick);
(<HTMLButtonElement>document.querySelector("button.move")).addEventListener("click", onMoveMapClick);

ui.settings = {};
[ "pixelsPerUnit", "layerDepthOffset" ].forEach((setting: string) => {
  let queryName = `.property-${setting}`;
  let settingObj = ui.settings[setting] = <HTMLInputElement>document.querySelector(queryName);

  settingObj.addEventListener("change", (event) => {
    let value = (setting === "layerDepthOffset") ? parseFloat(settingObj.value) : parseInt(settingObj.value);
    socket.emit("edit:assets", info.assetId, "setProperty", setting, value, (err: string) => { if (err != null) { alert(err); return; } });
  });
});

ui.gridCheckbox = <HTMLInputElement>document.querySelector("input.grid-checkbox");
ui.gridCheckbox.addEventListener("change", onChangeGridDisplay);
ui.highlightCheckbox = <HTMLInputElement>document.querySelector("input.highlight-checkbox");
ui.highlightCheckbox.addEventListener("change", onChangeHighlight);
ui.highlightSlider = <HTMLInputElement>document.querySelector("input.highlight-slider")
ui.highlightSlider.addEventListener("input", onChangeHighlight);

ui.brushToolButton = <HTMLInputElement>document.querySelector("input#Brush");
ui.brushToolButton.addEventListener("change", () => { selectBrush(); });
ui.fillToolButton = <HTMLInputElement>document.querySelector("input#Fill");
ui.fillToolButton.addEventListener("change", () => { selectFill(); });
ui.selectionToolButton = <HTMLInputElement>document.querySelector("input#Selection");
ui.selectionToolButton.addEventListener("change", () => { selectSelection(); });
ui.eraserToolButton = <HTMLInputElement>document.querySelector("input#Eraser");
ui.eraserToolButton.addEventListener("change", () => { selectEraser(); });

ui.layersTreeView = new TreeView(document.querySelector(".layers-tree-view"), { dropCallback: onLayerDrop, multipleSelection: false });
ui.layersTreeView.on("selectionChange", onLayerSelect);

document.querySelector("button.new-layer").addEventListener("click", onNewLayerClick);
document.querySelector("button.rename-layer").addEventListener("click", onRenameLayerClick);
document.querySelector("button.delete-layer").addEventListener("click", onDeleteLayerClick);

ui.mousePositionLabel = {
  x: <HTMLLabelElement>document.querySelector("label.position-x"),
  y: <HTMLLabelElement>document.querySelector("label.position-y")
}

// Keybindings
SupClient.setupHotkeys();
document.addEventListener("keyup", (event) => {
  switch (event.keyCode) {
    case (<any>window).KeyEvent.DOM_VK_B: selectBrush(); break;
    case (<any>window).KeyEvent.DOM_VK_F: selectFill(); break;
    case (<any>window).KeyEvent.DOM_VK_S: selectSelection(); break;
    case (<any>window).KeyEvent.DOM_VK_E: selectEraser(); break;
    case (<any>window).KeyEvent.DOM_VK_G: ui.gridCheckbox.checked = ! ui.gridCheckbox.checked; onChangeGridDisplay(); break;
    case (<any>window).KeyEvent.DOM_VK_I: ui.highlightCheckbox.checked = ! ui.highlightCheckbox.checked; onChangeHighlight(); break;
    case (<any>window).KeyEvent.DOM_VK_H: flipTilesHorizontally(); break;
    case (<any>window).KeyEvent.DOM_VK_V: flipTilesVertically(); break;
    case (<any>window).KeyEvent.DOM_VK_R: rotateTiles(); break;
  }
});

function onTileSetChange(event: Event) {
  let entry = SupClient.findEntryByPath(data.projectClient.entries.pub, (<HTMLInputElement>event.target).value);

  if (entry != null && entry.type === "tileSet") {
    socket.emit("edit:assets", info.assetId, "changeTileSet", entry.id, (err: string) => { if (err != null) { alert(err); return; } });
  }
}

function onResizeMapClick() {
  SupClient.dialogs.prompt("Enter a new width for the map.", null, data.tileMapUpdater.tileMapAsset.pub.width.toString(), "Resize", (newWidthString) => {
    if (newWidthString == null) return;
    let newWidth = parseInt(newWidthString);
    if (isNaN(newWidth)) return;

    SupClient.dialogs.prompt("Enter a new height for the map.", null, data.tileMapUpdater.tileMapAsset.pub.height.toString(), "Resize", (newHeightString) => {
      if (newHeightString == null) return;
      let newHeight = parseInt(newHeightString);
      if (isNaN(newHeight)) return;

      if (newWidth === data.tileMapUpdater.tileMapAsset.pub.width && newHeight === data.tileMapUpdater.tileMapAsset.pub.height) return;

      socket.emit("edit:assets", info.assetId, "resizeMap", newWidth, newHeight, (err: string) => {
        if (err != null) { alert(err); }
      });
    });
  });
}

function onMoveMapClick() {
  SupClient.dialogs.prompt("Enter the horizontal offset.", null, "0", "Apply offset", (horizontalOffsetString) => {
    if (horizontalOffsetString == null) return;
    let horizontalOffset = parseInt(horizontalOffsetString);
    if (isNaN(horizontalOffset)) return;

    SupClient.dialogs.prompt("Enter the vertical offset.", null, "0", "Apply offset", (verticalOffsetString) => {
      if (verticalOffsetString == null) return;
      let verticalOffset = parseInt(verticalOffsetString);
      if (isNaN(verticalOffset)) return;

      if (horizontalOffset === 0 && verticalOffset === 0) return;

      socket.emit("edit:assets", info.assetId, "moveMap", horizontalOffset, verticalOffset, (err: string) => {
        if (err != null) { alert(err); }
      });
    });
  });
}

function onNewLayerClick() {
  SupClient.dialogs.prompt("Enter a name for the layer.", null, "Layer", "Create", (name) => {
    if (name == null) return;

    let index = SupClient.getTreeViewInsertionPoint(ui.layersTreeView).index;
    index = data.tileMapUpdater.tileMapAsset.pub.layers.length - index + 1;
    socket.emit("edit:assets", info.assetId, "newLayer", name, index, (err: string, layerId: string) => {
      if (err != null) { alert(err); return; }

      ui.layersTreeView.clearSelection();
      ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${layerId}"]`));
      tileSetArea.selectedLayerId = layerId;
    });
  });
}

function onRenameLayerClick() {
  if (ui.layersTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.layersTreeView.selectedNodes[0];
  let layer = data.tileMapUpdater.tileMapAsset.layers.byId[selectedNode.dataset["id"]];

  SupClient.dialogs.prompt("Enter a new name for the layer.", null, layer.name, "Rename", (newName) => {
    if (newName == null) return;

    socket.emit("edit:assets", info.assetId, "renameLayer", layer.id, newName, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });
}

function onDeleteLayerClick() {
  if (ui.layersTreeView.selectedNodes.length !== 1) return;
  SupClient.dialogs.confirm("Are you sure you want to delete the selected layer?", "Delete", (confirm) => {
    if (!confirm) return;

    let selectedNode = ui.layersTreeView.selectedNodes[0];
    socket.emit("edit:assets", info.assetId, "deleteLayer", selectedNode.dataset.id, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });
}

function onLayerDrop(dropInfo: any, orderedNodes: any[]) {
  let id = orderedNodes[0].dataset.id;

  let layer = data.tileMapUpdater.tileMapAsset.layers.byId[id];
  let currentIndex = data.tileMapUpdater.tileMapAsset.pub.layers.indexOf(layer);
  let newIndex = SupClient.getListViewDropIndex(dropInfo, data.tileMapUpdater.tileMapAsset.layers, true);

  socket.emit("edit:assets", info.assetId, "moveLayer", id, newIndex, (err: string) => {
    if (err != null) { alert(err); return; }
  });

  return false;
}

function onLayerSelect() {
  if (ui.layersTreeView.selectedNodes.length === 0) {
    ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${tileSetArea.selectedLayerId}"]`));
  } else {
    tileSetArea.selectedLayerId = ui.layersTreeView.selectedNodes[0].dataset["id"];
  }

  onChangeHighlight();

  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
  let z = (pub.layers.indexOf(layer) + 0.5) * pub.layerDepthOffset
  mapArea.patternActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, z));
}

function onChangeGridDisplay() {
  mapArea.gridActor.threeObject.visible = ui.gridCheckbox.checked;
}

function onChangeHighlight() {
  for (let id in data.tileMapUpdater.tileMapRenderer.layerMeshesById) {
    let layerMesh = data.tileMapUpdater.tileMapRenderer.layerMeshesById[id];

    if (ui.highlightCheckbox.checked && id !== tileSetArea.selectedLayerId) {
      layerMesh.material.opacity = parseFloat(ui.highlightSlider.value) / 100;
    } else {
      layerMesh.material.opacity = 1;
    }
  }
}

export function selectBrush(x?: number, y?: number, width=1, height=1) {
  if (x != null && y != null) data.tileSetUpdater.tileSetRenderer.select(x, y, width, height);

  let ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalPosition(tmpPosition);
  tmpPosition.y = Math.round(tmpPosition.y * ratio);
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalScale(tmpScale);
  tmpScale.y = Math.round(tmpScale.y * ratio);
  let layerData: (number|boolean)[][] = [];
  for (let y = -tmpScale.y - 1; y >= 0; y--) {
    for (let x = 0; x < tmpScale.x; x++) {
      layerData.push([ tmpPosition.x + x, -tmpPosition.y + y, false, false, 0 ]);
    }
  }
  setupPattern(layerData, tmpScale.x);

  ui.brushToolButton.checked = true;
  mapArea.patternActor.threeObject.visible = true;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = true;
  mapArea.patternBackgroundActor.threeObject.visible = true;
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(width, height / ratio, 1));
}

export function selectFill(x?: number, y?: number) {
  if (x != null && y != null) data.tileSetUpdater.tileSetRenderer.select(x, y);

  data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalPosition(tmpPosition);
  setupFillPattern([ tmpPosition.x, -tmpPosition.y, false, false, 0 ]);

  ui.fillToolButton.checked = true;
  mapArea.patternActor.threeObject.visible = true;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = true;
  mapArea.patternBackgroundActor.threeObject.visible = false;
}

export function selectSelection() {
  ui.selectionToolButton.checked = true;
  mapArea.patternActor.threeObject.visible = false;
  mapArea.patternBackgroundActor.threeObject.visible = false;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = false;

  mapArea.selectionStartPoint = null;
}

export function selectEraser() {
  ui.eraserToolButton.checked = true;
  mapArea.patternActor.threeObject.visible = false;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = false;
  mapArea.patternBackgroundActor.threeObject.visible = true;
  let ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(1, 1 / ratio, 1));
}

export function setupLayer(layer: TileMapLayerPub, index: number) {
  let liElt = <HTMLLIElement>document.createElement("li");
  (<any>liElt.dataset).id = layer.id;

  let displayCheckbox = document.createElement("input");
  displayCheckbox.classList.add("display");
  displayCheckbox.type = "checkbox";
  displayCheckbox.checked = true;
  displayCheckbox.addEventListener("change", () => {
    data.tileMapUpdater.tileMapRenderer.layerVisibleById[layer.id] = displayCheckbox.checked;
  });
  displayCheckbox.addEventListener("click", (event) => { event.stopPropagation(); });
  liElt.appendChild(displayCheckbox);

  let indexSpan = document.createElement("span");
  indexSpan.classList.add("index");
  indexSpan.textContent = `${index} -`
  liElt.appendChild(indexSpan);

  let nameSpan = document.createElement("span");
  nameSpan.classList.add("name");
  nameSpan.textContent = layer.name;
  liElt.appendChild(nameSpan);

  ui.layersTreeView.insertAt(liElt, "item", data.tileMapUpdater.tileMapAsset.pub.layers.length - 1 - index);
}

export function refreshLayersId() {
  for (let layerIndex = 0; layerIndex < data.tileMapUpdater.tileMapAsset.pub.layers.length; layerIndex++) {
    let layerId = data.tileMapUpdater.tileMapAsset.pub.layers[layerIndex].id;
    let indexSpanElt = <HTMLSpanElement>ui.layersTreeView.treeRoot.querySelector(`[data-id="${layerId}"] .index`);
    indexSpanElt.textContent = `${layerIndex} -`;
  }
}
