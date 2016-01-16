import { editAsset, data } from "./network";
import mapArea, { setupPattern, setupFillPattern, flipTilesVertically, flipTilesHorizontally, rotateTiles, selectEntireLayer } from "./mapArea";
import tileSetArea from "./tileSetArea";

/* tslint:disable */
let TreeView = require("dnd-tree-view");
let PerfectResize = require("perfect-resize");
/* tslint:enable */

let tmpPosition = new SupEngine.THREE.Vector3();
let tmpScale = new SupEngine.THREE.Vector3();

import { TileMapLayerPub } from "../../data/TileMapLayers";

let ui: {
  tileSetInput?: HTMLInputElement;
  openTileSetButton?: HTMLButtonElement;

  sizeInput?: HTMLInputElement;

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

ui.tileSetInput = document.querySelector(".property-tileSetId") as HTMLInputElement;
ui.tileSetInput.addEventListener("input", onTileSetChange);
ui.tileSetInput.addEventListener("keyup", (event: Event) => { event.stopPropagation(); });

ui.openTileSetButton = document.querySelector("button.open-tileSet") as HTMLButtonElement;
ui.openTileSetButton.addEventListener("click", (event) => {
  window.parent.postMessage({ type: "openEntry", id: data.tileMapUpdater.tileMapAsset.pub.tileSetId }, window.location.origin);
});

ui.sizeInput = document.querySelector(".property-size") as HTMLInputElement;
(document.querySelector("button.resize") as HTMLInputElement).addEventListener("click", onResizeMapClick);
(document.querySelector("button.move") as HTMLInputElement).addEventListener("click", onMoveMapClick);

ui.settings = {};
[ "pixelsPerUnit", "layerDepthOffset" ].forEach((setting: string) => {
  let queryName = `.property-${setting}`;
  let settingObj = ui.settings[setting] = document.querySelector(queryName) as HTMLInputElement;

  settingObj.addEventListener("change", (event) => {
    let value = (setting === "layerDepthOffset") ? parseFloat(settingObj.value) : parseInt(settingObj.value, 10);
    editAsset("setProperty", setting, value);
  });
});

ui.gridCheckbox = document.querySelector("input.grid-checkbox") as HTMLInputElement;
ui.gridCheckbox.addEventListener("change", onChangeGridDisplay);
ui.highlightCheckbox = document.querySelector("input.highlight-checkbox") as HTMLInputElement;
ui.highlightCheckbox.addEventListener("change", onChangeHighlight);
ui.highlightSlider = document.querySelector("input.highlight-slider") as HTMLInputElement;
ui.highlightSlider.addEventListener("input", onChangeHighlight);

ui.brushToolButton = document.querySelector("input#Brush") as HTMLInputElement;
ui.brushToolButton.addEventListener("change", () => { selectBrushTool(); });
ui.fillToolButton = document.querySelector("input#Fill") as HTMLInputElement;
ui.fillToolButton.addEventListener("change", () => { selectFillTool(); });
ui.selectionToolButton = document.querySelector("input#Selection") as HTMLInputElement;
ui.selectionToolButton.addEventListener("change", () => { selectSelectionTool(); });
ui.eraserToolButton = document.querySelector("input#Eraser") as HTMLInputElement;
ui.eraserToolButton.addEventListener("change", () => { selectEraserTool(); });

ui.layersTreeView = new TreeView(document.querySelector(".layers-tree-view"), { dropCallback: onLayerDrop, multipleSelection: false });
ui.layersTreeView.on("selectionChange", onLayerSelect);

document.querySelector("button.new-layer").addEventListener("click", onNewLayerClick);
document.querySelector("button.rename-layer").addEventListener("click", onRenameLayerClick);
document.querySelector("button.delete-layer").addEventListener("click", onDeleteLayerClick);

ui.mousePositionLabel = {
  x: document.querySelector("label.position-x") as HTMLLabelElement,
  y: document.querySelector("label.position-y") as HTMLLabelElement
};

// Keybindings
SupClient.setupHotkeys();
document.addEventListener("keyup", (event) => {
  if ((event.target as HTMLInputElement).tagName === "INPUT") return;

  let keyEvent = (window as any).KeyEvent;
  switch (event.keyCode) {
    case keyEvent.DOM_VK_B: selectBrushTool(); break;
    case keyEvent.DOM_VK_F: selectFillTool(); break;
    case keyEvent.DOM_VK_S: selectSelectionTool(); break;
    case keyEvent.DOM_VK_E: selectEraserTool(); break;
    case keyEvent.DOM_VK_G: ui.gridCheckbox.checked = !ui.gridCheckbox.checked; onChangeGridDisplay(); break;
    case keyEvent.DOM_VK_I: ui.highlightCheckbox.checked = !ui.highlightCheckbox.checked; onChangeHighlight(); break;
    case keyEvent.DOM_VK_H: flipTilesHorizontally(); break;
    case keyEvent.DOM_VK_V: flipTilesVertically(); break;
    case keyEvent.DOM_VK_R: rotateTiles(); break;
    case keyEvent.DOM_VK_A:
      if (event.ctrlKey) {
        selectSelectionTool();
        selectEntireLayer();
      }
      break;
  }
});
SupClient.setupHelpCallback(() => {
    window.parent.postMessage({ type: "openTool", name: "documentation", state: { section: "tileMap" } }, window.location.origin);
});

function onTileSetChange(event: Event) {
  let value = (event.target as HTMLInputElement).value;
  if (value === "") { editAsset("changeTileSet", null); return; }

  let entry = SupClient.findEntryByPath(data.projectClient.entries.pub, value);
  if (entry != null && entry.type === "tileSet") editAsset("changeTileSet", entry.id);
}

function onResizeMapClick() {
  let options = {
    initialValue: data.tileMapUpdater.tileMapAsset.pub.width.toString(),
    validationLabel: SupClient.i18n.t("tileMapEditor:resize"),
    cancelLabel: SupClient.i18n.t("common:actions.skip")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("tileMapEditor:newWidthPrompt"), options, (newWidthString) => {
    /* tslint:enable:no-unused-expression */
    let newWidth = data.tileMapUpdater.tileMapAsset.pub.width;
    if (newWidthString != null && !isNaN(parseInt(newWidthString, 10)))
      newWidth = parseInt(newWidthString, 10);

    let options = {
      initialValue: data.tileMapUpdater.tileMapAsset.pub.height.toString(),
      validationLabel: SupClient.i18n.t("tileMapEditor:resize"),
      cancelLabel: SupClient.i18n.t("common:actions.skip")
    };

    /* tslint:disable:no-unused-expression */
    new SupClient.dialogs.PromptDialog(SupClient.i18n.t("tileMapEditor:newHeightPrompt"), options, (newHeightString) => {
      /* tslint:enable:no-unused-expression */
      let newHeight = data.tileMapUpdater.tileMapAsset.pub.height;
      if (newHeightString != null && !isNaN(parseInt(newHeightString, 10)))
        newHeight = parseInt(newHeightString, 10);

      if (newWidth === data.tileMapUpdater.tileMapAsset.pub.width && newHeight === data.tileMapUpdater.tileMapAsset.pub.height) return;
      editAsset("resizeMap", newWidth, newHeight);
    });
  });
}

function onMoveMapClick() {
  let options = {
    initialValue: "0",
    validationLabel: SupClient.i18n.t("tileMapEditor:applyOffset"),
    cancelLabel: SupClient.i18n.t("common:actions.skip")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("tileMapEditor:horizontalOffsetPrompt"), options, (horizontalOffsetString) => {
    /* tslint:enable:no-unused-expression */
    let horizontalOffset = 0;
    if (horizontalOffsetString != null && !isNaN(parseInt(horizontalOffsetString, 10)))
      horizontalOffset = parseInt(horizontalOffsetString, 10);

    /* tslint:disable:no-unused-expression */
    new SupClient.dialogs.PromptDialog(SupClient.i18n.t("tileMapEditor:verticalOffsetPrompt"), options, (verticalOffsetString) => {
      /* tslint:enable:no-unused-expression */
      let verticalOffset = 0;
      if (verticalOffsetString != null && !isNaN(parseInt(verticalOffsetString, 10)))
        verticalOffset = parseInt(verticalOffsetString, 10);

      if (horizontalOffset === 0 && verticalOffset === 0) return;
      editAsset("moveMap", horizontalOffset, verticalOffset);
    });
  });
}

function onNewLayerClick() {
  let options = {
    initialValue: SupClient.i18n.t("tileMapEditor:newLayerInitialValue"),
    validationLabel: SupClient.i18n.t("common:actions.create")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("tileMapEditor:newLayerPrompt"), options, (name) => {
    /* tslint:enable:no-unused-expression */
    if (name == null) return;

    let index = SupClient.getTreeViewInsertionPoint(ui.layersTreeView).index;
    index = data.tileMapUpdater.tileMapAsset.pub.layers.length - index + 1;
    editAsset("newLayer", name, index, (layerId: string) => {
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

  let options = {
    initialValue: layer.name,
    validationLabel: SupClient.i18n.t("common:actions.rename")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("tileMapEditor:renameLayerPrompt"), options, (newName) => {
    /* tslint:enable:no-unused-expression */
    if (newName == null) return;
    editAsset("renameLayer", layer.id, newName);
  });
}

function onDeleteLayerClick() {
  if (ui.layersTreeView.selectedNodes.length !== 1) return;

  let confirmString = SupClient.i18n.t("tileMapEditor:deleteLayerConfirm");
  let validateString = SupClient.i18n.t("common:actions.delete");
  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.ConfirmDialog(confirmString, validateString, (confirm) => {
    /* tslint:enable:no-unused-expression */
    if (!confirm) return;

    let selectedNode = ui.layersTreeView.selectedNodes[0];
    editAsset("deleteLayer", selectedNode.dataset.id);
  });
}

function onLayerDrop(dropInfo: any, orderedNodes: any[]) {
  let id = orderedNodes[0].dataset.id;
  let newIndex = SupClient.getListViewDropIndex(dropInfo, data.tileMapUpdater.tileMapAsset.layers, true);

  editAsset("moveLayer", id, newIndex);
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
  let z = (pub.layers.indexOf(layer) + 0.5) * pub.layerDepthOffset;
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

export function selectBrushTool(x?: number, y?: number, width = 1, height = 1) {
  ui.brushToolButton.checked = true;

  if (data.tileMapUpdater.tileSetAsset == null || data.tileMapUpdater.tileSetAsset.pub == null) return;
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

  mapArea.lastTile = null;
  mapArea.patternActor.threeObject.visible = true;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = true;
  mapArea.patternBackgroundActor.threeObject.visible = true;
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(width, height / ratio, 1));
}

export function selectFillTool(x?: number, y?: number) {
  ui.fillToolButton.checked = true;

  if (data.tileMapUpdater.tileSetAsset == null || data.tileMapUpdater.tileSetAsset.pub == null) return;
  if (x != null && y != null) data.tileSetUpdater.tileSetRenderer.select(x, y);

  data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalPosition(tmpPosition);
  setupFillPattern([ tmpPosition.x, -tmpPosition.y, false, false, 0 ]);

  mapArea.patternActor.threeObject.visible = true;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = true;
  mapArea.patternBackgroundActor.threeObject.visible = false;
}

export function selectSelectionTool() {
  ui.selectionToolButton.checked = true;

  if (data.tileMapUpdater.tileSetAsset == null || data.tileMapUpdater.tileSetAsset.pub == null) return;

  mapArea.patternActor.threeObject.visible = false;
  mapArea.patternBackgroundActor.threeObject.visible = false;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = false;

  mapArea.selectionStartPoint = null;
}

export function selectEraserTool() {
  ui.eraserToolButton.checked = true;

  if (data.tileMapUpdater.tileSetAsset == null || data.tileMapUpdater.tileSetAsset.pub == null) return;

  mapArea.patternActor.threeObject.visible = false;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = false;
  mapArea.patternBackgroundActor.threeObject.visible = true;
  let ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(1, 1 / ratio, 1));
}

export function setupLayer(layer: TileMapLayerPub, index: number) {
  let liElt = document.createElement("li") as HTMLLIElement;
  liElt.dataset["id"] = layer.id;

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
  indexSpan.textContent = `${index} -`;
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
    let indexSpanElt = ui.layersTreeView.treeRoot.querySelector(`[data-id="${layerId}"] .index`) as HTMLSpanElement;
    indexSpanElt.textContent = `${layerIndex} -`;
  }
}
