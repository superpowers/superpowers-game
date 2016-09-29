import TileSetRenderer from "../../components/TileSetRenderer";
import TileSetRendererUpdater from "../../components/TileSetRendererUpdater";

import * as TreeView from "dnd-tree-view";
import * as ResizeHandle from "resize-handle";

let data: { projectClient: SupClient.ProjectClient; tileSetUpdater: TileSetRendererUpdater; selectedTile: { x: number; y: number; } };
let ui: any = {};
let socket: SocketIOClient.Socket;

let hasStarted = false;
let isTabActive = true;
let animationFrame: number;

window.addEventListener("message", (event) => {
  if (event.data.type === "deactivate" || event.data.type === "activate") {
    isTabActive = event.data.type === "activate";
    onChangeActive();
  }
});

function onChangeActive() {
  const stopRendering = !hasStarted || !isTabActive;

  if (stopRendering) {
    if (animationFrame != null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  } else if (animationFrame == null) {
    animationFrame = requestAnimationFrame(tick);
  }
}

function start() {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);

  // Drawing
  ui.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas"));
  ui.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

  const cameraActor = new SupEngine.Actor(ui.gameInstance, "Camera");
  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
  ui.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
  ui.cameraComponent.setOrthographicMode(true);
  ui.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](
    cameraActor, ui.cameraComponent,
    { zoomSpeed: 1.5, zoomMin: 0.1, zoomMax: 10000 },
    () => { data.tileSetUpdater.tileSetRenderer.gridRenderer.setOrthgraphicScale(ui.cameraComponent.orthographicScale); }
  );

  // Sidebar
  new ResizeHandle(document.querySelector(".sidebar") as HTMLElement, "right");

  const fileSelect = <HTMLInputElement>document.querySelector("input.file-select");
  fileSelect.addEventListener("change", onFileSelectChange);
  document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

  document.querySelector("button.download").addEventListener("click", onDownloadTileset);

  ui.gridWidthInput = document.querySelector("input.grid-width");
  ui.gridWidthInput.addEventListener("change", () => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", "grid.width", parseInt(ui.gridWidthInput.value, 10)); });

  ui.gridHeightInput = document.querySelector("input.grid-height");
  ui.gridHeightInput.addEventListener("change", () => { data.projectClient.editAsset(SupClient.query.asset, "setProperty", "grid.height", parseInt(ui.gridHeightInput.value, 10)); });

  ui.selectedTileInput = document.querySelector("input.selected-tile-number");

  // Tile properties
  ui.propertiesTreeView = new TreeView(document.querySelector(".properties-tree-view") as HTMLElement, { multipleSelection: false });
  ui.propertiesTreeView.on("selectionChange", onPropertySelect);
  document.querySelector("button.new-property").addEventListener("click", onNewPropertyClick);
  document.querySelector("button.rename-property").addEventListener("click", onRenamePropertyClick);
  document.querySelector("button.delete-property").addEventListener("click", onDeletePropertyClick);

  hasStarted = true;
  onChangeActive();
}

// Network callbacks
const onEditCommands: { [command: string]: Function; } = {};
function onConnected() {
  data = {} as any;
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: false });

  const tileSetActor = new SupEngine.Actor(ui.gameInstance, "Tile Set");
  const tileSetRenderer = new TileSetRenderer(tileSetActor);
  const config = { tileSetAssetId: SupClient.query.asset };

  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived: onAssetReceived,
    onAssetEdited: (assetId, command, ...args) => { if (onEditCommands[command] != null) onEditCommands[command](...args); },
    onAssetTrashed: SupClient.onAssetTrashed
  };

  data.tileSetUpdater = new TileSetRendererUpdater(data.projectClient, tileSetRenderer, config, subscriber);
}

function onAssetReceived(err: string, asset: any) {
  setupProperty("grid-width", data.tileSetUpdater.tileSetAsset.pub.grid.width);
  setupProperty("grid-height", data.tileSetUpdater.tileSetAsset.pub.grid.height);
  selectTile({ x: 0, y: 0 });
}

onEditCommands["upload"] = () => {
  selectTile({ x: 0, y: 0 });
};

onEditCommands["setProperty"] = (key: string, value: any) => {
  setupProperty(key, value);
  selectTile({ x: 0, y: 0 });
};

onEditCommands["addTileProperty"] = (tile: { x: number; y: number; }, name: string) => {
  if (tile.x !== data.selectedTile.x && tile.y !== data.selectedTile.y) return;

  addTileProperty(name);
};

onEditCommands["renameTileProperty"] = (tile: { x: number; y: number; }, name: string, newName: string) => {
  if (tile.x !== data.selectedTile.x && tile.y !== data.selectedTile.y) return;

  const liElt = ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`);
  liElt.querySelector(".name").textContent = newName;
  liElt.dataset["name"] = newName;

  const properties = Object.keys(data.tileSetUpdater.tileSetAsset.pub.tileProperties[`${tile.x}_${tile.y}`]);
  properties.sort();
  ui.propertiesTreeView.remove(liElt);
  ui.propertiesTreeView.insertAt(liElt, "item", properties.indexOf(newName));

  if (ui.selectedProperty === name) {
    ui.selectedProperty = newName;
    ui.propertiesTreeView.addToSelection(liElt);
  }
};

onEditCommands["deleteTileProperty"] = (tile: { x: number; y: number; }, name: string) => {
  if (tile.x !== data.selectedTile.x && tile.y !== data.selectedTile.y) return;

  ui.propertiesTreeView.remove(ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`));
};

onEditCommands["editTileProperty"] = (tile: { x: number; y: number; }, name: string, value: string) => {
  if (tile.x !== data.selectedTile.x && tile.y !== data.selectedTile.y) return;

  const liElt = ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`);
  liElt.querySelector(".value").value = value;
};

function setupProperty(key: string, value: any) {
  switch (key) {
    case "grid-width": ui.gridWidthInput.value = value; break;
    case "grid-height": ui.gridHeightInput.value = value; break;
  }
}

function selectTile(tile: { x: number; y: number; }) {
  data.selectedTile = tile;
  const pub = data.tileSetUpdater.tileSetAsset.pub;

  const tilePerRow = (pub.texture != null) ? Math.floor(pub.texture.image.width / pub.grid.width) : 1;
  const tilePerColumn = (pub.texture != null) ? Math.floor(pub.texture.image.height / pub.grid.height) : 1;

  const tileIndex = (tile.x === tilePerRow - 1 && tile.y === tilePerColumn - 1) ? -1 : tile.x + tile.y * tilePerRow;
  ui.selectedTileInput.value = tileIndex;

  while (ui.propertiesTreeView.treeRoot.children.length !== 0) {
    ui.propertiesTreeView.remove(ui.propertiesTreeView.treeRoot.children[0]);
  }

  if (pub.tileProperties[`${tile.x}_${tile.y}`] == null) return;

  const properties = Object.keys(pub.tileProperties[`${tile.x}_${tile.y}`]);
  properties.sort();
  for (const propertyName of properties) {
    addTileProperty(propertyName, pub.tileProperties[`${tile.x}_${tile.y}`][propertyName]);
  }
}

function addTileProperty(name: string, value = "") {
  const liElt = document.createElement("li");
  liElt.dataset["name"] = name;

  const nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = name;
  liElt.appendChild(nameSpan);

  const valueInput = document.createElement("input");
  valueInput.type = "string";
  valueInput.className = "value";
  valueInput.value = value;
  valueInput.addEventListener("input", () => { data.projectClient.editAsset(SupClient.query.asset, "editTileProperty", data.selectedTile, ui.selectedProperty, valueInput.value); });

  liElt.appendChild(valueInput);

  ui.propertiesTreeView.insertAt(liElt, "item");
}

// User interface
function onFileSelectChange(event: Event) {
  if ((<HTMLInputElement>event.target).files.length === 0) return;

  const reader = new FileReader;
  reader.onload = (event) => { data.projectClient.editAsset(SupClient.query.asset, "upload", reader.result); };

  reader.readAsArrayBuffer((<HTMLInputElement>event.target).files[0]);
  (<HTMLFormElement>(<HTMLInputElement>event.target).parentElement).reset();
}

function onDownloadTileset(event: Event) {
  function triggerDownload(name: string) {
    const anchor = document.createElement("a");
    document.body.appendChild(anchor);
    anchor.style.display = "none";
    anchor.href = data.tileSetUpdater.tileSetAsset.url;

    // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
    (anchor as any).download = `${name}.png`;
    anchor.click();
    document.body.removeChild(anchor);
  }

  const options = {
    initialValue: SupClient.i18n.t("tileSetEditor:texture.downloadInitialValue"),
    validationLabel: SupClient.i18n.t("common:actions.download")
  };

  if (SupApp != null) {
    triggerDownload(options.initialValue);
  } else {
    new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("tileSetEditor:texture.downloadPrompt"), options, (name) => {
      if (name == null) return;
      triggerDownload(name);
    });
  }
}

function onPropertySelect() {
  if (ui.propertiesTreeView.selectedNodes.length === 1) {
    ui.selectedProperty = ui.propertiesTreeView.selectedNodes[0].dataset["name"];
    (<HTMLButtonElement>document.querySelector("button.rename-property")).disabled = false;
    (<HTMLButtonElement>document.querySelector("button.delete-property")).disabled = false;
  } else {
    ui.selectedProperty = null;
    (<HTMLButtonElement>document.querySelector("button.rename-property")).disabled = true;
    (<HTMLButtonElement>document.querySelector("button.delete-property")).disabled = true;
  }
}

function onNewPropertyClick() {
  const options = {
    initialValue: SupClient.i18n.t("tileSetEditor:newPropertyInitialValue"),
    validationLabel: SupClient.i18n.t("common:actions.create")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("tileSetEditor:newPropertyPrompt"), options, (name) => {
    if (name == null) return;

    data.projectClient.editAsset(SupClient.query.asset, "addTileProperty", data.selectedTile, name, () => {
      ui.selectedProperty = name;
      ui.propertiesTreeView.clearSelection();
      const liElt = ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${ui.selectedProperty}"]`);
      ui.propertiesTreeView.addToSelection(liElt);
      (<HTMLInputElement>liElt.querySelector("input")).focus();
      (<HTMLButtonElement>document.querySelector("button.rename-property")).disabled = false;
      (<HTMLButtonElement>document.querySelector("button.delete-property")).disabled = false;
    });
  });
}

function onRenamePropertyClick() {
  if (ui.propertiesTreeView.selectedNodes.length !== 1) return;

  const options = {
    initialValue: ui.selectedProperty,
    validationLabel: SupClient.i18n.t("common:actions.rename")
  };

  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("tileSetEditor:renamePropertyPrompt"), options, (newName) => {
    if (newName == null) return;
    data.projectClient.editAsset(SupClient.query.asset, "renameTileProperty", data.selectedTile, ui.selectedProperty, newName);
  });
}

function onDeletePropertyClick() {
  if (ui.selectedProperty == null) return;

  const confirmLabel = SupClient.i18n.t("tileSetEditor:deletePropertyConfirm");
  const validationLabel = SupClient.i18n.t("common:actions.delete");
  new SupClient.Dialogs.ConfirmDialog(confirmLabel, { validationLabel }, (confirm) => {
    if (!confirm) return;
    data.projectClient.editAsset(SupClient.query.asset, "deleteTileProperty", data.selectedTile, ui.selectedProperty);
  });
}

// Drawing
let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp = 0) {
  animationFrame = requestAnimationFrame(tick);

  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  const { updates, timeLeft } = ui.gameInstance.tick(accumulatedTime, handleTilesetArea);
  accumulatedTime = timeLeft;

  if (updates > 0) ui.gameInstance.draw();
}

function handleTilesetArea() {
  if (data == null || data.tileSetUpdater.tileSetAsset == null) return;

  const pub = data.tileSetUpdater.tileSetAsset.pub;
  if (pub.texture == null) return;

  if (ui.gameInstance.input.mouseButtons[0].wasJustReleased) {
    const mousePosition = ui.gameInstance.input.mousePosition;
    const [ mouseX, mouseY ] = ui.cameraControls.getScenePosition(mousePosition.x, mousePosition.y);
    const x = Math.floor(mouseX);
    const ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
    const y = Math.floor(mouseY * ratio);

    if (x >= 0 && x < pub.texture.image.width / pub.grid.width &&
    y >= 0 && y < pub.texture.image.height / pub.grid.height &&
    (x !== data.selectedTile.x || y !== data.selectedTile.y)) {
      data.tileSetUpdater.tileSetRenderer.select(x, y);
      selectTile({ x, y });
    }
  }
}

SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "tileSetEditor" }], start);
