import TileMap from "../../components/TileMap";
import TileMapRenderer from "../../components/TileMapRenderer";
import TileMapRendererUpdater from "../../components/TileMapRendererUpdater";
import { TileMapLayerPub } from "../../data/TileMapLayers";

import TileSet from "../../components/TileSet";
import TileSetRenderer from "../../components/TileSetRenderer";
import TileSetRendererUpdater from "../../components/TileSetRendererUpdater";

import * as _ from "lodash";

let TreeView = require("dnd-tree-view");

import * as querystring from "querystring";
let qs = querystring.parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset };
let data: { projectClient?: SupClient.ProjectClient; tileMapUpdater?: TileMapRendererUpdater, tileSetUpdater?: TileSetRendererUpdater };
let ui: any = {};
let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  // Map Area
  ui.mapArea = {};
  ui.mapArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.map"));
  ui.mapArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);
  ui.mapArea.gameInstance.update();
  ui.mapArea.gameInstance.draw();

  let cameraActor = new SupEngine.Actor(ui.mapArea.gameInstance, "Camera");
  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 100));
  ui.mapArea.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
  ui.mapArea.cameraComponent.setOrthographicMode(true);
  ui.mapArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](
    cameraActor, ui.mapArea.cameraComponent,
    { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 60 },
    () => { ui.mapArea.gridRenderer.setOrthgraphicScale(ui.mapArea.cameraComponent.orthographicScale); }
  );

  ui.mapArea.gridActor = new SupEngine.Actor(ui.mapArea.gameInstance, "Grid");
  ui.mapArea.gridActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 90));
  ui.mapArea.gridRenderer = new SupEngine.editorComponentClasses["GridRenderer"](ui.mapArea.gridActor, {
    width: 1, height: 1, ratio: 1,
    orthographicScale: ui.mapArea.cameraComponent.orthographicScale
  });

  ui.mapArea.patternActor = new SupEngine.Actor(ui.mapArea.gameInstance, "Pattern");
  ui.mapArea.patternRenderer = new TileMapRenderer(ui.mapArea.patternActor, null, null);
  ui.mapArea.patternBackgroundActor = new SupEngine.Actor(ui.mapArea.gameInstance, "Pattern Background");
  ui.mapArea.patternBackgroundRenderer = new SupEngine.editorComponentClasses["FlatColorRenderer"](ui.mapArea.patternBackgroundActor);
  ui.mapArea.duplicatingSelection = false;

  // Tile Set Area
  ui.tileSetArea = {};
  ui.tileSetArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.tileSet"));
  ui.tileSetArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);
  ui.tileSetArea.gameInstance.update();
  ui.tileSetArea.gameInstance.draw();

  cameraActor = new SupEngine.Actor(ui.tileSetArea.gameInstance, "Camera");
  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
  ui.tileSetArea.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
  ui.tileSetArea.cameraComponent.setOrthographicMode(true);
  new SupEngine.editorComponentClasses["Camera2DControls"](
    cameraActor, ui.tileSetArea.cameraComponent,
    { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 60 },
    () => { data.tileSetUpdater.tileSetRenderer.gridRenderer.setOrthgraphicScale(ui.tileSetArea.cameraComponent.orthographicScale); }
  );

  // Sidebar
  ui.tileSetInput = <HTMLInputElement>document.querySelector(".property-tileSetId");
  ui.tileSetInput.addEventListener("input", onTileSetChange);
  ui.tileSetInput.addEventListener("keyup", (event: Event) => { event.stopPropagation(); });

  ui.widthLabel = document.querySelector(".property-width");
  ui.heightLabel = document.querySelector(".property-height");
  (<HTMLButtonElement>document.querySelector("button.resize")).addEventListener("click", onResizeMapClick);
  (<HTMLButtonElement>document.querySelector("button.move")).addEventListener("click", onMoveMapClick);

  ui.allSettings = [ "pixelsPerUnit", "layerDepthOffset" ];
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
    let settingObj = obj[parts[parts.length - 1]] = <HTMLInputElement>document.querySelector(queryName);

    settingObj.addEventListener("change", (event) => {
      let value = (setting === "layerDepthOffset") ? parseFloat(settingObj.value) : parseInt(settingObj.value);
      socket.emit("edit:assets", info.assetId, "setProperty", setting, value, (err: string) => { if (err != null) { alert(err); return; } });
    });
  });

  ui.gridCheckbox = document.querySelector("input.grid-checkbox");
  ui.gridCheckbox.addEventListener("change", onChangeGridDisplay);
  ui.highlightCheckbox = document.querySelector("input.highlight-checkbox");
  ui.highlightCheckbox.addEventListener("change", onChangeHighlight);
  ui.highlightSlider = document.querySelector("input.highlight-slider")
  ui.highlightSlider.addEventListener("input", onChangeHighlight);

  ui.brushToolButton = document.querySelector("input#Brush");
  ui.brushToolButton.addEventListener("change", () => { selectBrush(); });
  ui.selectionToolButton = document.querySelector("input#Selection");
  ui.selectionToolButton.addEventListener("change", () => { selectSelection(); });
  ui.eraserToolButton = document.querySelector("input#Eraser");
  ui.eraserToolButton.addEventListener("change", () => { selectEraser(); });

  ui.layersTreeView = new TreeView(document.querySelector(".layers-tree-view"), onLayerDrop);
  ui.layersTreeView.on("selectionChange", onLayerSelect);

  document.querySelector("button.new-layer").addEventListener("click", onNewLayerClick);
  document.querySelector("button.rename-layer").addEventListener("click", onRenameLayerClick);
  document.querySelector("button.delete-layer").addEventListener("click", onDeleteLayerClick);

  // Keybindings
  document.addEventListener("keyup", (event) => {
    switch (event.keyCode) {
      case (<any>window).KeyEvent.DOM_VK_B: selectBrush(); break;
      case (<any>window).KeyEvent.DOM_VK_S: selectSelection(); break;
      case (<any>window).KeyEvent.DOM_VK_E: selectEraser(); break;
      case (<any>window).KeyEvent.DOM_VK_G: ui.gridCheckbox.checked = ! ui.gridCheckbox.checked; onChangeGridDisplay(); break;
      case (<any>window).KeyEvent.DOM_VK_H: ui.highlightCheckbox.checked = ! ui.highlightCheckbox.checked; onChangeHighlight(); break;
      case (<any>window).KeyEvent.DOM_VK_F: flipTilesHorizontally(); break;
      case (<any>window).KeyEvent.DOM_VK_V: flipTilesVertically(); break;
      case (<any>window).KeyEvent.DOM_VK_R: rotateTiles(); break;
    }
  });

  requestAnimationFrame(draw);
}

// Network callbacks
let onEditCommands: any = {};
let onTileSetEditCommands: any = {};

function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: true });

  let tileMapActor = new SupEngine.Actor(ui.mapArea.gameInstance, "Tile Map");
  let tileMapRenderer = new TileMapRenderer(tileMapActor, null, null);
  let config = { tileMapAssetId: info.assetId, tileSetAssetId: <string>null };
  let receiveCallbacks = { tileMap: onTileMapAssetReceived, tileSet: onTileSetAssetReceived };
  let editCallbacks = { tileMap: onEditCommands, tileSet: onTileSetEditCommands };

  data.tileMapUpdater = new TileMapRenderer.Updater(data.projectClient, tileMapRenderer, config, receiveCallbacks, editCallbacks);
}

function onTileMapAssetReceived() {
  let pub = data.tileMapUpdater.tileMapAsset.pub;

  let tileSetActor = new SupEngine.Actor(ui.tileSetArea.gameInstance, "Tile Set");
  let tileSetRenderer = new TileSetRenderer(tileSetActor);
  let config = { tileSetAssetId: pub.tileSetId };
  // let tileSetProjectClient = new SupClient.ProjectClient(socket, { subEntries: false });
  data.tileSetUpdater = new TileSetRenderer.Updater(data.projectClient, tileSetRenderer, config);

  updateTileSetInput();
  onEditCommands.resizeMap();

  ui.allSettings.forEach((setting: string) => {
    let parts = setting.split(".");
    let obj: any = pub;
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; })
    onEditCommands.setProperty(setting, obj[parts[parts.length - 1]]);
  })

  for (let index = 0; index < pub.layers.length; index++) {
    setupLayer(pub.layers[index], index);
  }

  ui.tileSetArea.selectedLayerId = pub.layers[0].id.toString();
  ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${pub.layers[0].id}"]`));

  setupPattern([ [0, 0, false, false, 0] ]);
}

// Tile map network callbacks

function updateTileSetInput() {
  let tileSetName =
    (data.tileMapUpdater.tileMapAsset.pub.tileSetId != null) ?
      data.projectClient.entries.getPathFromId(data.tileMapUpdater.tileMapAsset.pub.tileSetId) : "";
  ui.tileSetInput.value = tileSetName;
}

onEditCommands.changeTileSet = () => {
  updateTileSetInput();
  data.tileSetUpdater.changeTileSetId(data.tileMapUpdater.tileMapAsset.pub.tileSetId);
};

onEditCommands.resizeMap = () => {
  ui.widthLabel.textContent = data.tileMapUpdater.tileMapAsset.pub.width;
  ui.heightLabel.textContent = data.tileMapUpdater.tileMapAsset.pub.height;
  ui.mapArea.gridRenderer.resize(data.tileMapUpdater.tileMapAsset.pub.width, data.tileMapUpdater.tileMapAsset.pub.height);
};

onEditCommands.setProperty = (path: string, value: any) => {
  let parts = path.split(".");

  let obj = ui.settings;
  parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; });
  obj[parts[parts.length - 1]].value = value;

  if (path === "pixelsPerUnit" && data.tileMapUpdater.tileSetAsset != null) {
    ui.mapArea.cameraControls.setMultiplier(value / data.tileMapUpdater.tileSetAsset.pub.gridSize / 1);

    ui.mapArea.gridRenderer.setRatio(data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize);
    ui.mapArea.patternRenderer.refreshPixelsPerUnit(data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit);
    ui.mapArea.patternBackgroundRenderer.refreshScale(1 / data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit);
  }
};

onEditCommands.newLayer = (layer: TileMapLayerPub, index: number) => {
  setupLayer(layer, index);
};

function setupLayer(layer: TileMapLayerPub, index: number) {
  let liElt = <HTMLLIElement>document.createElement("li");
  (<any>liElt.dataset).id = layer.id;

  let displayCheckbox = document.createElement("input");
  displayCheckbox.className = "display";
  displayCheckbox.type = "checkbox";
  displayCheckbox.checked = true;
  displayCheckbox.addEventListener("change", () => { data.tileMapUpdater.tileMapRenderer.layerMeshesById[layer.id].visible = displayCheckbox.checked; });

  displayCheckbox.addEventListener("click", (event) => { event.stopPropagation(); });

  liElt.appendChild(displayCheckbox);

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = layer.name;
  liElt.appendChild(nameSpan);

  ui.layersTreeView.insertAt(liElt, "item", index);
}

onEditCommands.renameLayer = (id: string, newName: string) => {
  let layerElt = ui.layersTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  layerElt.querySelector(".name").textContent = newName;
};

onEditCommands.deleteLayer = (id: string, index: number) => {
  let layerElt = ui.layersTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  ui.layersTreeView.remove(layerElt);

  if (id === ui.tileSetArea.selectedLayerId) {
    index = Math.max(0, index - 1);
    ui.tileSetArea.selectedLayerId = data.tileMapUpdater.tileMapAsset.pub.layers[index].id;
    ui.layersTreeView.clearSelection();
    ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${ui.tileSetArea.selectedLayerId}"]`));
  }
};

onEditCommands.moveLayer = (id: string, newIndex: number) => {
  let layerElt = ui.layersTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  ui.layersTreeView.insertAt(layerElt, "item", newIndex);
};

function onTileSetAssetReceived() {
  let tileMapPub = data.tileMapUpdater.tileMapAsset.pub;
  let tileSetPub = data.tileMapUpdater.tileSetAsset.pub;

  ui.mapArea.cameraControls.setMultiplier(tileMapPub.pixelsPerUnit / tileSetPub.gridSize / 1);
  ui.mapArea.gridRenderer.setRatio(tileMapPub.pixelsPerUnit / tileSetPub.gridSize);
  ui.mapArea.patternRenderer.setTileSet(new TileSet(tileSetPub), data.tileMapUpdater.tileSetThreeTexture);
  ui.mapArea.patternBackgroundRenderer.setup("#900090", 1 / tileMapPub.pixelsPerUnit, tileSetPub.gridSize);
};

onTileSetEditCommands.upload = () => {
  ui.mapArea.patternRenderer.setTileSet(new TileSet(data.tileMapUpdater.tileSetAsset.pub), data.tileMapUpdater.tileSetThreeTexture);
  if (ui.brushToolButton.checked) {
    selectBrush(0, 0);
    setupPattern([ [ 0, 0, false, false, 0 ] ]);
  }
};

onTileSetEditCommands.setProperty = () => {
  let tileMapPub = data.tileMapUpdater.tileMapAsset.pub;
  let tileSetPub = data.tileMapUpdater.tileSetAsset.pub;

  ui.mapArea.cameraControls.setMultiplier(tileMapPub.pixelsPerUnit / tileSetPub.gridSize / 1);
  ui.mapArea.gridRenderer.setRatio(tileMapPub.pixelsPerUnit / tileSetPub.gridSize);
  ui.mapArea.patternRenderer.setTileSet(new TileSet(tileSetPub), data.tileMapUpdater.tileSetThreeTexture);
  ui.mapArea.patternBackgroundRenderer.setup("#900090", 1 / tileMapPub.pixelsPerUnit, tileSetPub.gridSize);

  if (ui.brushToolButton.checked) {
    selectBrush(0, 0);
    setupPattern([ [ 0, 0, false, false, 0 ] ]);
  }
};

// User interface
function setupPattern(layerData: (number|boolean)[][], width=1) {
  let patternData = {
    tileSetId: <string>null,
    width: width, height: layerData.length / width,
    pixelsPerUnit: data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit,
    layerDepthOffset: data.tileMapUpdater.tileMapAsset.pub.layerDepthOffset,
    layers: [ { id: <string>null, name: <string>null, data: layerData } ]
  };

  ui.mapArea.patternRenderer.setTileMap(new TileMap(patternData));
}

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

    socket.emit("edit:assets", info.assetId, "newLayer", name, SupClient.getTreeViewInsertionPoint(ui.layersTreeView).index, (err: string, layerId: string) => {
      if (err != null) { alert(err); return; }

      ui.layersTreeView.clearSelection();
      ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${layerId}"]`));
      ui.tileSetArea.selectedLayerId = layerId;
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

  let newIndex = SupClient.getListViewDropIndex(dropInfo, data.tileMapUpdater.tileMapAsset.layers);
  socket.emit("edit:assets", info.assetId, "moveLayer", id, newIndex, (err: string) => {
    if (err != null) { alert(err); return; }
  });

  return false;
}

function onLayerSelect() {
  if (ui.layersTreeView.selectedNodes.length !== 1) {
    ui.layersTreeView.clearSelection();
    ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${ui.tileSetArea.selectedLayerId}"]`));
  } else {
    ui.tileSetArea.selectedLayerId = ui.layersTreeView.selectedNodes[0].dataset["id"];
  }

  onChangeHighlight();
}

function onChangeGridDisplay() {
  ui.mapArea.gridActor.threeObject.visible = ui.gridCheckbox.checked;
}

function onChangeHighlight() {
  for (let id in data.tileMapUpdater.tileMapRenderer.layerMeshesById) {
    let layerMesh = data.tileMapUpdater.tileMapRenderer.layerMeshesById[id];

    if (ui.highlightCheckbox.checked && id !== ui.tileSetArea.selectedLayerId) {
      layerMesh.material.opacity = ui.highlightSlider.value / 100;
    } else {
      layerMesh.material.opacity = 1;
    }
  }
}

function selectBrush(x?: number, y?: number, width=1, height=1) {
  let ratio = data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
  if (x != null && y != null) {
    data.tileSetUpdater.tileSetRenderer.select(x, y, width, height);
  } else {
    let position = data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalPosition();
    let startX = position.x * ratio;
    let startY = -position.y * ratio;

    let scale = data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalScale();
    let layerData: (number|boolean)[][] = [];
    for (let y = scale.y - 1; y >= 0; y--) {
      for (let x = 0; x < scale.x; x++) {
        layerData.push([ startX + x, startY + y, false, false, 0 ]);
      }
    }

    setupPattern(layerData, scale.x);
  }

  ui.brushToolButton.checked = true;
  ui.mapArea.patternActor.threeObject.visible = true;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = true;
  ui.mapArea.patternBackgroundActor.threeObject.visible = true;
  ui.mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(width, height, 1));
}

function selectSelection() {
  ui.selectionToolButton.checked = true;
  ui.mapArea.patternActor.threeObject.visible = false;
  ui.mapArea.patternBackgroundActor.threeObject.visible = false;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = false;

  ui.mapArea.selectionStartPoint = null;
}

function selectEraser() {
  ui.eraserToolButton.checked = true;
  ui.mapArea.patternActor.threeObject.visible = false;
  data.tileSetUpdater.tileSetRenderer.selectedTileActor.threeObject.visible = false;
  ui.mapArea.patternBackgroundActor.threeObject.visible = true;
  ui.mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(1, 1, 1));
}

// Drawing
function draw() {
  requestAnimationFrame(draw);

  if (data == null || data.tileMapUpdater.tileMapAsset == null || data.tileMapUpdater.tileSetAsset == null) return;

  handleMapArea();
  handleTileSetArea();
}

function editMap(x: number, y: number, tileValue: (number|boolean)[]) {
  if (x >= 0 && x < data.tileMapUpdater.tileMapAsset.pub.width && y >= 0 && y < data.tileMapUpdater.tileMapAsset.pub.height) {
    let layer = data.tileMapUpdater.tileMapAsset.layers.byId[ui.tileSetArea.selectedLayerId];
    let index = y * data.tileMapUpdater.tileMapAsset.pub.width + x;

    if (tileValue != null) {
      let sameTile = true;
      for (let i = 0; i < tileValue.length; i++) {
        if (layer.data[index][i] !== tileValue[i]) {
          sameTile = false;
          break;
        }
      }

      if (sameTile) return;
    }

    socket.emit("edit:assets", info.assetId, "editMap", layer.id, x, y, tileValue, (err: string) => { if (err != null) { alert(err); return; } });
  }
}

function flipTilesHorizontally() {
  if (!ui.mapArea.patternActor.threeObject.visible) return;

  let width = ui.mapArea.patternRenderer.tileMap.data.width;
  let height = ui.mapArea.patternRenderer.tileMap.data.height;
  let layerData: (number|boolean)[][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = width - 1; x >= 0; x--) {
      let tileValue = ui.mapArea.patternRenderer.tileMap.data.layers[0].data[y * width + x];
      tileValue[2] = !tileValue[2];
      layerData.push(tileValue);
    }
  }

  setupPattern(layerData, width);
}

function flipTilesVertically() {
  if (!ui.mapArea.patternActor.threeObject.visible) return;

  let width = ui.mapArea.patternRenderer.tileMap.data.width;
  let height = ui.mapArea.patternRenderer.tileMap.data.height;
  let layerData: (number|boolean)[][] = [];
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      let tileValue = ui.mapArea.patternRenderer.tileMap.data.layers[0].data[y * width + x];
      tileValue[3] = !tileValue[3];

      layerData.push(tileValue);
    }
  }

  setupPattern(layerData, width);
}

function rotateTiles() {
  if (!ui.mapArea.patternActor.threeObject.visible) return;

  let width = ui.mapArea.patternRenderer.tileMap.data.width;
  let height = ui.mapArea.patternRenderer.tileMap.data.height;
  let layerData: (number|boolean)[][] = [];
  for (let x = 0; x < width; x++) {
    for (let y = height - 1; y >= 0; y--) {
      let tileValue = ui.mapArea.patternRenderer.tileMap.data.layers[0].data[y * width + x];
      tileValue[4] += 90;
      if (tileValue[4] == 360) tileValue[4] = 0;

      layerData.push(tileValue);
    }
  }

  setupPattern(layerData, height);
  ui.mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(height, width, 1));
}

function handleMapArea() {
  ui.mapArea.gameInstance.update();

  if (data == null || data.tileMapUpdater.tileMapAsset == null || data.tileMapUpdater.tileSetAsset == null) return;

  let [ mouseX, mouseY ] = getMapGridPosition(ui.mapArea.gameInstance, ui.mapArea.cameraComponent);

  // Edit tiles
  if (ui.mapArea.gameInstance.input.mouseButtons[0].isDown) {
    if (ui.eraserToolButton.checked) {
      editMap(mouseX, mouseY, null);
    } else if (ui.mapArea.patternActor.threeObject.visible) {

      for (let tileIndex = 0; tileIndex < ui.mapArea.patternRenderer.tileMap.data.layers[0].data.length; tileIndex++) {
        let tileValue = ui.mapArea.patternRenderer.tileMap.data.layers[0].data[tileIndex];
        let x = mouseX + tileIndex % ui.mapArea.patternRenderer.tileMap.data.width;
        let y = mouseY + Math.floor(tileIndex / ui.mapArea.patternRenderer.tileMap.data.width);

        editMap(x, y, tileValue);
      }

      if (ui.selectionToolButton.checked && ! ui.mapArea.duplicatingSelection) {
        ui.mapArea.patternActor.threeObject.visible = false;
        ui.mapArea.patternBackgroundActor.threeObject.visible = false;
      }
    }
  }

  // Quick switch to Brush or Eraser
  if (ui.mapArea.gameInstance.input.mouseButtons[2].wasJustReleased) {
    if (!ui.selectionToolButton.checked || !ui.mapArea.patternBackgroundActor.threeObject.visible) {
      if (mouseX >= 0 && mouseX < data.tileMapUpdater.tileMapAsset.pub.width && mouseY >= 0 && mouseY < data.tileMapUpdater.tileMapAsset.pub.height) {
        let layer = data.tileMapUpdater.tileMapAsset.layers.byId[ui.tileSetArea.selectedLayerId];
        let tile = layer.data[mouseY * data.tileMapUpdater.tileMapAsset.pub.width + mouseX];
        if (tile[0] == -1) {
          selectEraser();
        } else {
          setupPattern([ tile ]);
          selectBrush(<number>tile[0], <number>tile[1]);
        }
      }
    } else {
      ui.mapArea.selectionStartPoint = null;
      ui.mapArea.patternBackgroundActor.threeObject.visible = false;
      ui.mapArea.patternActor.threeObject.visible = false;
      ui.mapArea.duplicatingSelection = false;
    }
  }

  if (ui.mapArea.patternActor.threeObject.visible || ui.eraserToolButton.checked) {
    let x = Math.max(0, Math.min(data.tileMapUpdater.tileMapAsset.pub.width - 1, mouseX));
    let y = Math.max(0, Math.min(data.tileMapUpdater.tileMapAsset.pub.height - 1, mouseY));

    let ratio = data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
    let patternPosition = new SupEngine.THREE.Vector3(x/ratio, y/ratio, data.tileMapUpdater.tileMapAsset.layers.pub.length * data.tileMapUpdater.tileMapAsset.pub.layerDepthOffset);
    ui.mapArea.patternActor.setLocalPosition(patternPosition)
    ui.mapArea.patternBackgroundActor.setLocalPosition(patternPosition);
  }

  // Selection
  if (ui.selectionToolButton.checked) {

    if (ui.mapArea.gameInstance.input.mouseButtons[0].wasJustPressed) {
      // A pattern is already in the buffer
      if (!ui.mapArea.patternActor.threeObject.visible) {
        if (mouseX >= 0 && mouseX < data.tileMapUpdater.tileMapAsset.pub.width && mouseY >= 0 && mouseY < data.tileMapUpdater.tileMapAsset.pub.height) {
          ui.mapArea.patternBackgroundActor.threeObject.visible = true;
          ui.mapArea.selectionStartPoint = { x: mouseX, y: mouseY };

        } else {
          ui.mapArea.selectionStartPoint = null;
          ui.mapArea.patternActor.threeObject.visible = false;
          ui.mapArea.patternBackgroundActor.threeObject.visible = false;
        }
      }
    }

    if (ui.mapArea.selectionStartPoint != null) {
      if (ui.mapArea.gameInstance.input.mouseButtons[0].isDown) {
        // Clamp mouse values
        let x = Math.max(0, Math.min(data.tileMapUpdater.tileMapAsset.pub.width - 1, mouseX));
        let y = Math.max(0, Math.min(data.tileMapUpdater.tileMapAsset.pub.height - 1, mouseY));

        ui.mapArea.selectionEndPoint = { x, y };
      }

      let startX = Math.min(ui.mapArea.selectionStartPoint.x, ui.mapArea.selectionEndPoint.x);
      let startY = Math.min(ui.mapArea.selectionStartPoint.y, ui.mapArea.selectionEndPoint.y);
      let width = Math.abs(ui.mapArea.selectionEndPoint.x - ui.mapArea.selectionStartPoint.x) + 1;
      let height = Math.abs(ui.mapArea.selectionEndPoint.y - ui.mapArea.selectionStartPoint.y) + 1;

      if (ui.mapArea.gameInstance.input.mouseButtons[0].isDown) {
        let ratio = data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
        let patternPosition = new SupEngine.THREE.Vector3(startX/ratio, startY/ratio, data.tileMapUpdater.tileMapAsset.layers.pub.length * data.tileMapUpdater.tileMapAsset.pub.layerDepthOffset);
        ui.mapArea.patternBackgroundActor.setLocalPosition(patternPosition);
        ui.mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(width, height, 1));
      }

      // Delete selection
      else if (ui.mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_DELETE].wasJustReleased) {
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            editMap(startX + x, startY + y, null);
          }
        }

        ui.mapArea.patternBackgroundActor.threeObject.visible = false;
        ui.mapArea.selectionStartPoint = null;
      }

      // Move/duplicate the selection
      else if (ui.mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_M].wasJustReleased ||
      ui.mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_D].wasJustReleased) {
        let layerData: (number|boolean)[][] = [];
        let layer = data.tileMapUpdater.tileMapAsset.layers.byId[ui.tileSetArea.selectedLayerId];

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let tile = layer.data[(startY + y) * data.tileMapUpdater.tileMapAsset.pub.width + startX + x];
            layerData.push(tile);

            if (!ui.mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_D].wasJustReleased)
              editMap(startX + x, startY + y, null);
          }
        }

        setupPattern(layerData, width);
        ui.mapArea.patternActor.threeObject.visible = true;
        ui.mapArea.selectionStartPoint = null;

        ui.mapArea.duplicatingSelection = ui.mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_D].wasJustReleased;
      }
    }
  }

  ui.mapArea.gameInstance.draw();
}

function getMapGridPosition(gameInstance: SupEngine.GameInstance, cameraComponent: any) {
  let mousePosition = gameInstance.input.mousePosition;
  let position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
  let cameraPosition = cameraComponent.actor.getLocalPosition();

  let x = position.x / gameInstance.threeRenderer.domElement.width;
  x = x * 2 - 1;
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
  x += cameraPosition.x;
  x *= data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
  x = Math.floor(x);

  let y = position.y / gameInstance.threeRenderer.domElement.height;
  y = y * 2 - 1;
  y *= cameraComponent.orthographicScale / 2;
  y -= cameraPosition.y;
  y *= data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
  y = Math.floor(y);

  return [ x, -y - 1 ];
}

function handleTileSetArea() {
  ui.tileSetArea.gameInstance.update();

  let tilesPerRow = data.tileMapUpdater.tileSetAsset.pub.domImage.width / data.tileMapUpdater.tileSetAsset.pub.gridSize;
  let tilesPerColumn = data.tileMapUpdater.tileSetAsset.pub.domImage.height / data.tileMapUpdater.tileSetAsset.pub.gridSize;

  let [ mouseX, mouseY ] = getTileSetGridPosition(ui.tileSetArea.gameInstance, ui.tileSetArea.cameraComponent);
  if (ui.tileSetArea.gameInstance.input.mouseButtons[0].wasJustPressed) {

    if (mouseX >= 0 && mouseX < tilesPerRow && mouseY >= 0 && mouseY < tilesPerColumn) {
      ui.tileSetArea.selectionStartPoint = { x: mouseX, y: mouseY };
      selectBrush(mouseX, mouseY);
    }

  } else if (ui.tileSetArea.gameInstance.input.mouseButtons[0].wasJustReleased && ui.tileSetArea.selectionStartPoint != null) {
    // Clamp mouse values
    let x = Math.max(0, Math.min(tilesPerRow - 1, mouseX));
    let y = Math.max(0, Math.min(tilesPerColumn - 1, mouseY));

    let startX = Math.min(ui.tileSetArea.selectionStartPoint.x, x);
    let startY = Math.min(ui.tileSetArea.selectionStartPoint.y, y);
    let width = Math.abs(x - ui.tileSetArea.selectionStartPoint.x) + 1;
    let height = Math.abs(y - ui.tileSetArea.selectionStartPoint.y);
    let layerData: (number|boolean)[][] = [];
    for (let y = height; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        layerData.push([ startX + x, startY + y, false, false, 0 ]);
      }
    }

    setupPattern(layerData, width);
    selectBrush(startX, startY, width, height + 1);
    ui.tileSetArea.selectionStartPoint = null;
  }

  if (ui.tileSetArea.selectionStartPoint != null) {
    // Clamp mouse values
    let x = Math.max(0, Math.min(tilesPerRow - 1, mouseX));
    let y = Math.max(0, Math.min(tilesPerColumn - 1, mouseY));

    let width = x - ui.tileSetArea.selectionStartPoint.x;
    if (width >= 0) {
      width += 1;
      x = ui.tileSetArea.selectionStartPoint.x;
    } else {
      width -= 1;
      x = ui.tileSetArea.selectionStartPoint.x + 1;
    }

    let height = y - ui.tileSetArea.selectionStartPoint.y;
    if (height >= 0) {
      height += 1;
      y = ui.tileSetArea.selectionStartPoint.y;
    } else {
      height -= 1;
      y = ui.tileSetArea.selectionStartPoint.y + 1;
    }

    data.tileSetUpdater.tileSetRenderer.select(x, y, width, height);
  }

  ui.tileSetArea.gameInstance.draw();
}

function getTileSetGridPosition(gameInstance: SupEngine.GameInstance, cameraComponent: any) {
  let mousePosition = gameInstance.input.mousePosition;
  let position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
  let cameraPosition = cameraComponent.actor.getLocalPosition();

  let x = position.x / gameInstance.threeRenderer.domElement.width;
  x = x * 2 - 1;
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
  x += cameraPosition.x;
  x = Math.floor(x);

  let y = position.y / gameInstance.threeRenderer.domElement.height;
  y = y * 2 - 1;
  y *= cameraComponent.orthographicScale / 2;
  y -= cameraPosition.y;
  y = Math.floor(y);

  return [ x, y ];
}

// Start
start();
