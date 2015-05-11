import info from "./info";
import ui, { setupLayer, selectBrush } from "./ui";
import { mapArea, tileSetArea, setupPattern } from "./engine";

import { TileMapLayerPub } from "../../data/TileMapLayers";
import TileMapRenderer from "../../components/TileMapRenderer";
import TileMapRendererUpdater from "../../components/TileMapRendererUpdater";

import TileSet from "../../components/TileSet";
import TileSetRenderer from "../../components/TileSetRenderer";
import TileSetRendererUpdater from "../../components/TileSetRendererUpdater";

export let data: { projectClient?: SupClient.ProjectClient; tileMapUpdater?: TileMapRendererUpdater, tileSetUpdater?: TileSetRendererUpdater } = {};

export let socket = SupClient.connect(info.projectId);
socket.on("connect", onConnected);
socket.on("disconnect", SupClient.onDisconnected);
SupClient.setupHotkeys();

let onEditCommands: any = {};
let onTileSetEditCommands: any = {};

function onConnected() {
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: true });

  let tileMapActor = new SupEngine.Actor(mapArea.gameInstance, "Tile Map");
  let tileMapRenderer = new TileMapRenderer(tileMapActor, null, null);
  let config = { tileMapAssetId: info.assetId, tileSetAssetId: <string>null };
  let receiveCallbacks = { tileMap: onTileMapAssetReceived, tileSet: onTileSetAssetReceived };
  let editCallbacks = { tileMap: onEditCommands, tileSet: onTileSetEditCommands };

  data.tileMapUpdater = new TileMapRenderer.Updater(data.projectClient, tileMapRenderer, config, receiveCallbacks, editCallbacks);
}

// Tile Map
function onTileMapAssetReceived() {
  let pub = data.tileMapUpdater.tileMapAsset.pub;

  let tileSetActor = new SupEngine.Actor(tileSetArea.gameInstance, "Tile Set");
  let tileSetRenderer = new TileSetRenderer(tileSetActor);
  let config = { tileSetAssetId: pub.tileSetId };
  data.tileSetUpdater = new TileSetRenderer.Updater(data.projectClient, tileSetRenderer, config);

  updateTileSetInput();
  onEditCommands.resizeMap();

  for (let setting in ui.settings) onEditCommands.setProperty(setting, (<any>pub)[setting]);

  for (let index = 0; index < pub.layers.length; index++) {
    setupLayer(pub.layers[index], index);
  }

  tileSetArea.selectedLayerId = pub.layers[0].id.toString();
  ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${pub.layers[0].id}"]`));

  setupPattern([ [0, 0, false, false, 0] ]);
}

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
  ui.widthLabel.textContent = data.tileMapUpdater.tileMapAsset.pub.width.toString();
  ui.heightLabel.textContent = data.tileMapUpdater.tileMapAsset.pub.height.toString();
  mapArea.gridRenderer.resize(data.tileMapUpdater.tileMapAsset.pub.width, data.tileMapUpdater.tileMapAsset.pub.height);
};

onEditCommands.setProperty = (path: string, value: any) => {
  ui.settings[path].value = value;

  if (path === "pixelsPerUnit" && data.tileMapUpdater.tileSetAsset != null) {
    mapArea.cameraControls.setMultiplier(value / data.tileMapUpdater.tileSetAsset.pub.gridSize / 1);

    mapArea.gridRenderer.setRatio(data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize);
    mapArea.patternRenderer.refreshPixelsPerUnit(data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit);
    mapArea.patternBackgroundRenderer.refreshScale(1 / data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit);
  }
};

onEditCommands.newLayer = (layer: TileMapLayerPub, index: number) => {
  setupLayer(layer, index);
};

onEditCommands.renameLayer = (id: string, newName: string) => {
  let layerElt = ui.layersTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  layerElt.querySelector(".name").textContent = newName;
};

onEditCommands.deleteLayer = (id: string, index: number) => {
  let layerElt = ui.layersTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  ui.layersTreeView.remove(layerElt);

  if (id === tileSetArea.selectedLayerId) {
    index = Math.max(0, index - 1);
    tileSetArea.selectedLayerId = data.tileMapUpdater.tileMapAsset.pub.layers[index].id;
    ui.layersTreeView.clearSelection();
    ui.layersTreeView.addToSelection(ui.layersTreeView.treeRoot.querySelector(`li[data-id="${tileSetArea.selectedLayerId}"]`));
  }
};

onEditCommands.moveLayer = (id: string, newIndex: number) => {
  let layerElt = ui.layersTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  ui.layersTreeView.insertAt(layerElt, "item", newIndex);
};

// Tile Set
function onTileSetAssetReceived() {
  let tileMapPub = data.tileMapUpdater.tileMapAsset.pub;
  let tileSetPub = data.tileMapUpdater.tileSetAsset.pub;

  mapArea.cameraControls.setMultiplier(tileMapPub.pixelsPerUnit / tileSetPub.gridSize / 1);
  mapArea.gridRenderer.setRatio(tileMapPub.pixelsPerUnit / tileSetPub.gridSize);
  mapArea.patternRenderer.setTileSet(new TileSet(tileSetPub), data.tileMapUpdater.tileSetThreeTexture);
  mapArea.patternBackgroundRenderer.setup("#900090", 1 / tileMapPub.pixelsPerUnit, tileSetPub.gridSize);
};

onTileSetEditCommands.upload = () => {
  mapArea.patternRenderer.setTileSet(new TileSet(data.tileMapUpdater.tileSetAsset.pub), data.tileMapUpdater.tileSetThreeTexture);
  if (ui.brushToolButton.checked) {
    selectBrush(0, 0);
    setupPattern([ [ 0, 0, false, false, 0 ] ]);
  }
};

onTileSetEditCommands.setProperty = () => {
  let tileMapPub = data.tileMapUpdater.tileMapAsset.pub;
  let tileSetPub = data.tileMapUpdater.tileSetAsset.pub;

  mapArea.cameraControls.setMultiplier(tileMapPub.pixelsPerUnit / tileSetPub.gridSize / 1);
  mapArea.gridRenderer.setRatio(tileMapPub.pixelsPerUnit / tileSetPub.gridSize);
  mapArea.patternRenderer.setTileSet(new TileSet(tileSetPub), data.tileMapUpdater.tileSetThreeTexture);
  mapArea.patternBackgroundRenderer.setup("#900090", 1 / tileMapPub.pixelsPerUnit, tileSetPub.gridSize);

  if (ui.brushToolButton.checked) {
    selectBrush(0, 0);
    setupPattern([ [ 0, 0, false, false, 0 ] ]);
  }
};
