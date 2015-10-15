import TileSetRenderer from "../../components/TileSetRenderer";
import TileSetRendererUpdater from "../../components/TileSetRendererUpdater";
import * as querystring from "querystring";

let TreeView = require("dnd-tree-view");
let PerfectResize = require("perfect-resize");

let qs = querystring.parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset };
let data: { projectClient?: SupClient.ProjectClient; tileSetUpdater?: TileSetRendererUpdater; selectedTile?: { x: number; y: number; } };
let ui: any = {};
let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  // Drawing
  ui.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas"));
  ui.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

  let cameraActor = new SupEngine.Actor(ui.gameInstance, "Camera");
  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
  ui.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
  ui.cameraComponent.setOrthographicMode(true);
  ui.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](
    cameraActor, ui.cameraComponent,
    { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 60 },
    () => { data.tileSetUpdater.tileSetRenderer.gridRenderer.setOrthgraphicScale(ui.cameraComponent.orthographicScale); }
  );

  // Sidebar
  new PerfectResize(document.querySelector(".sidebar"), "right");

  let fileSelect = <HTMLInputElement>document.querySelector("input.file-select");
  fileSelect.addEventListener("change", onFileSelectChange);
  document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

  document.querySelector("button.download").addEventListener("click", onDownloadTileset);

  ui.gridWidthInput = document.querySelector("input.grid-width");
  ui.gridWidthInput.addEventListener("change", () => {
    socket.emit("edit:assets", info.assetId, "setProperty", "grid.width", parseInt(ui.gridWidthInput.value), (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });

  ui.gridHeightInput = document.querySelector("input.grid-height");
  ui.gridHeightInput.addEventListener("change", () => {
    socket.emit("edit:assets", info.assetId, "setProperty", "grid.height", parseInt(ui.gridHeightInput.value), (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });

  ui.selectedTileLabel = document.querySelector("label.selected-tile-number");

  // Tile properties
  ui.propertiesTreeView = new TreeView(document.querySelector(".properties-tree-view"), () => { return false; });
  ui.propertiesTreeView.on("selectionChange", onPropertySelect);
  document.querySelector("button.new-property").addEventListener("click", onNewPropertyClick);
  document.querySelector("button.rename-property").addEventListener("click", onRenamePropertyClick);
  document.querySelector("button.delete-property").addEventListener("click", onDeletePropertyClick);

  requestAnimationFrame(tick);
}

// Network callbacks
let onEditCommands: any = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: false });

  let tileSetActor = new SupEngine.Actor(ui.gameInstance, "Tile Set");
  let tileSetRenderer = new TileSetRenderer(tileSetActor);
  let config = { tileSetAssetId: info.assetId };
  let receiveCallbacks = { tileSet: onAssetReceived };
  let editCallbacks = { tileSet: onEditCommands };

  data.tileSetUpdater = new TileSetRenderer.Updater(data.projectClient, tileSetRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived(err: string, asset: any) {
  setupProperty("grid-width", data.tileSetUpdater.tileSetAsset.pub.grid.width);
  setupProperty("grid-height", data.tileSetUpdater.tileSetAsset.pub.grid.height);
  selectTile({ x: 0, y: 0 });
}

onEditCommands.upload = () => {
  selectTile({ x: 0, y: 0 });
};

onEditCommands.setProperty = (key: string, value: any) => {
  setupProperty(key, value);
  selectTile({ x: 0, y: 0 });
};

onEditCommands.addTileProperty = (tile: { x: number; y: number; }, name: string) => {
  if (tile.x !== data.selectedTile.x && tile.y !== data.selectedTile.y) return;

  addTileProperty(name);
};

onEditCommands.renameTileProperty = (tile: { x: number; y: number; }, name: string, newName: string) => {
  if (tile.x !== data.selectedTile.x && tile.y !== data.selectedTile.y) return;

  let liElt = ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`);
  liElt.querySelector(".name").textContent = newName;
  liElt.dataset.name = newName;

  let properties = Object.keys(data.tileSetUpdater.tileSetAsset.pub.tileProperties[`${tile.x}_${tile.y}`]);
  properties.sort();
  ui.propertiesTreeView.remove(liElt);
  ui.propertiesTreeView.insertAt(liElt, "item", properties.indexOf(newName));

  if (ui.selectedProperty === name) {
    ui.selectedProperty = newName;
    ui.propertiesTreeView.addToSelection(liElt);
  }
}

onEditCommands.deleteTileProperty = (tile: { x: number; y: number; }, name: string) => {
  if (tile.x !== data.selectedTile.x && tile.y !== data.selectedTile.y) return;

  ui.propertiesTreeView.remove(ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`));
}

onEditCommands.editTileProperty = (tile: { x: number; y: number; }, name: string, value: string) => {
  if (tile.x !== data.selectedTile.x && tile.y !== data.selectedTile.y) return;

  let liElt = ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`);
  liElt.querySelector(".value").value = value;
}

function setupProperty(key: string, value: any) {
  switch (key) {
    case "grid-width": ui.gridWidthInput.value = value; break;
    case "grid-height": ui.gridHeightInput.value = value; break;
  }
}

function selectTile(tile: { x: number; y: number; }) {
  data.selectedTile = tile;
  let pub = data.tileSetUpdater.tileSetAsset.pub

  let tilePerRow = Math.floor(pub.domImage.width / pub.grid.width);
  let tilePerColumn = Math.floor(pub.domImage.height / pub.grid.height);

  let tileIndex = (tile.x === tilePerRow - 1 && tile.y === tilePerColumn - 1) ? -1 : tile.x + tile.y * tilePerRow;
  ui.selectedTileLabel.textContent = tileIndex;

  while (ui.propertiesTreeView.treeRoot.children.length !== 0) {
    ui.propertiesTreeView.remove(ui.propertiesTreeView.treeRoot.children[0]);
  }

  if (pub.tileProperties[`${tile.x}_${tile.y}`] == null) return;

  let properties = Object.keys(pub.tileProperties[`${tile.x}_${tile.y}`]);
  properties.sort();
  for (let propertyName of properties) {
    addTileProperty(propertyName, pub.tileProperties[`${tile.x}_${tile.y}`][propertyName]);
  }
}

function addTileProperty(name: string, value="") {
  let liElt = document.createElement("li");
  (<any>liElt.dataset).name = name;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = name;
  liElt.appendChild(nameSpan);

  let valueInput = document.createElement("input");
  valueInput.type = "string";
  valueInput.className = "value";
  valueInput.value = value;
  valueInput.addEventListener("input", () => {
    socket.emit("edit:assets", info.assetId, "editTileProperty", data.selectedTile, ui.selectedProperty, valueInput.value, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });

  liElt.appendChild(valueInput);

  ui.propertiesTreeView.insertAt(liElt, "item");
}

// User interface
function onFileSelectChange(event: Event) {
  if ((<HTMLInputElement>event.target).files.length === 0) return;

  let reader = new FileReader;
  reader.onload = (event) => {
    socket.emit("edit:assets", info.assetId, "upload", reader.result, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  };

  reader.readAsArrayBuffer((<HTMLInputElement>event.target).files[0]);
  (<HTMLFormElement>(<HTMLInputElement>event.target).parentElement).reset();
}

function onDownloadTileset(event: Event) {
  SupClient.dialogs.prompt("Enter a name for the image.", null, "Tile set", "Download", (name) => {
    if (name == null) return;

    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = data.tileSetUpdater.url;

    // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
    (<any>a).download = `${name}.png`;
    a.click();
    document.body.removeChild(a);
  });
}

function onPropertySelect() {
  if (ui.propertiesTreeView.selectedNodes.length > 1) {
    ui.propertiesTreeView.clearSelection();
    ui.propertiesTreeView.addToSelection(ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${ui.selectedProperty}"]`));
  } else if (ui.propertiesTreeView.selectedNodes.length === 1) {
    ui.selectedProperty = ui.propertiesTreeView.selectedNodes[0].dataset.name;
    (<HTMLButtonElement>document.querySelector("button.rename-property")).disabled = false;
    (<HTMLButtonElement>document.querySelector("button.delete-property")).disabled = false;
  } else {
    ui.selectedProperty = null;
    (<HTMLButtonElement>document.querySelector("button.rename-property")).disabled = true;
    (<HTMLButtonElement>document.querySelector("button.delete-property")).disabled = true;
  }
}

function onNewPropertyClick() {
  SupClient.dialogs.prompt("Enter a name for the property.", null, "property", "Create", (name) => {
    if (name == null) return;

    socket.emit("edit:assets", info.assetId, "addTileProperty", data.selectedTile, name, (err: string, id: string) => {
      if (err != null) { alert(err); return; }

      ui.selectedProperty = name;
      ui.propertiesTreeView.clearSelection();
      let liElt = ui.propertiesTreeView.treeRoot.querySelector(`li[data-name="${ui.selectedProperty}"]`);
      ui.propertiesTreeView.addToSelection(liElt);
      (<HTMLInputElement>liElt.querySelector("input")).focus();
      (<HTMLButtonElement>document.querySelector("button.rename-property")).disabled = false;
      (<HTMLButtonElement>document.querySelector("button.delete-property")).disabled = false;
    });
  });
}

function onRenamePropertyClick() {
  if (ui.propertiesTreeView.selectedNodes.length !== 1) return;

  SupClient.dialogs.prompt("Enter a new name for the property.", null, ui.selectedProperty, "Rename", (newName) => {
    if (newName == null) return;

    socket.emit("edit:assets", info.assetId, "renameTileProperty", data.selectedTile, ui.selectedProperty, newName, (err: string) => { if (err != null) { alert(err); return; } });
  });
}

function onDeletePropertyClick() {
  if (ui.selectedProperty == null) return;
  SupClient.dialogs.confirm("Are you sure you want to delete the selected property?", "Delete", (confirm) => {
    if (!confirm) return;

    socket.emit("edit:assets", info.assetId, "deleteTileProperty", data.selectedTile, ui.selectedProperty, (err: string) => { if (err != null) { alert(err); return; } });
  });
}

// Drawing
let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp=0) {
  requestAnimationFrame(tick);

  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = ui.gameInstance.tick(accumulatedTime, handleTilesetArea);
  accumulatedTime = timeLeft;

  if (updates > 0) ui.gameInstance.draw();
}

function handleTilesetArea() {
  if (ui.gameInstance.input.mouseButtons[0].wasJustReleased) {
    let mousePosition = ui.gameInstance.input.mousePosition;
    let [ mouseX, mouseY ] = ui.cameraControls.getScenePosition(mousePosition.x, mousePosition.y);
    let x = Math.floor(mouseX);
    let ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
    let y = Math.floor(mouseY * ratio);

    let pub = data.tileSetUpdater.tileSetAsset.pub;
    if (x >= 0 && x < pub.domImage.width / pub.grid.width &&
    y >= 0 && y < pub.domImage.height / pub.grid.height &&
    (x !== data.selectedTile.x || y !== data.selectedTile.y)) {
      data.tileSetUpdater.tileSetRenderer.select(x, y);
      selectTile({ x, y });
    }
  }
}

// Start
start();
