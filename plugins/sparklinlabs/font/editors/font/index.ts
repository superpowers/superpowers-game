import TextRenderer from "../../components/TextRenderer";
import TextRendererUpdater from "../../components/TextRendererUpdater";

let qs = require("querystring").parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset };
let data: {projectClient?: SupClient.ProjectClient; textUpdater?: TextRendererUpdater};
let ui: any = {};
let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  ui.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas"));
  ui.gameInstance.threeRenderer.setClearColor(0xbbbbbb);
  ui.gameInstance.update();
  ui.gameInstance.draw();

  let cameraActor = new SupEngine.Actor(ui.gameInstance, "Camera");
  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 1));
  let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
  cameraComponent.setOrthographicMode(true);
  cameraComponent.setOrthographicScale(5);
  new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent, {
    zoomSpeed: 1.5,
    zoomMin: 1,
    zoomMax: 60
  });

  // Sidebar
  let fileSelect = <HTMLInputElement>document.querySelector("input.file-select");
  fileSelect.addEventListener("change", onFileSelectChange);
  document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

  ui.allSettings = ["isBitmap", "filtering", "pixelsPerUnit", "size", "color", "gridWidth", "gridHeight", "charset", "charsetOffset"];
  ui.settings = {};
  ui.allSettings.forEach((setting: string) => {
    let settingObj: any = ui.settings[setting] = document.querySelector(`.property-${setting}`);
    settingObj.dataset.name = setting;

    if (setting === "filtering" || setting === "color") {
      settingObj.addEventListener("change", (event: any) => {
        socket.emit("edit:assets", info.assetId, "setProperty", event.target.dataset.name, event.target.value, (err: string) => { if (err != null) alert(err); });
      });
    } else if (setting === "charset") {
      settingObj.addEventListener("change", (event: any) => {
        let charset = (event.target.value != "") ? event.target.value : null;
        socket.emit("edit:assets", info.assetId, "setProperty", event.target.dataset.name, charset, (err: string) => { if (err != null) alert(err); });
      });
    } else if (setting === "isBitmap") {
      settingObj.addEventListener("click", (event: any) => {
        socket.emit("edit:assets", info.assetId, "setProperty", event.target.dataset.name, event.target.checked, (err: string) => { if (err != null) alert(err); });
      });
    } else {
      settingObj.addEventListener("change", (event: any) => {
        socket.emit("edit:assets", info.assetId, "setProperty", event.target.dataset.name, parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
      });
    }
  });

  ui.fontTable = document.querySelector("table.font");
  ui.bitmapTable = document.querySelector("table.bitmap");

  requestAnimationFrame(draw);
}

// Network callbacks
let onEditCommands: any =  {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  let textActor = new SupEngine.Actor(ui.gameInstance, "Text");
  let textRenderer = new TextRenderer(textActor);
  let config = { fontAssetId: info.assetId, text: "The quick brown fox jumps over the lazy dog", alignment: "center" };
  let receiveCallbacks = { font: onAssetReceived };
  let editCallbacks = { font: onEditCommands };
  data.textUpdater = new TextRendererUpdater(data.projectClient, textRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived() {
  ui.allSettings.forEach((setting: string) => {
    if(setting === "isBitmap") {
      ui.settings[setting].checked = data.textUpdater.fontAsset.pub.isBitmap;
      refreshTables();
    } else {
      ui.settings[setting].value = (<any>data.textUpdater.fontAsset.pub)[setting];
    }
  });

  ui.settings["charsetOffset"].disabled = data.textUpdater.fontAsset.pub.isBitmap && data.textUpdater.fontAsset.pub.charset != null;
}
onEditCommands.setProperty = (path: string, value: any) => {
  if(path === "isBitmap") {
    ui.settings[path].checked = value;
    refreshTables();
  } else ui.settings[path].value = value;

  if (path === "charset") {
    ui.settings["charsetOffset"].disabled = data.textUpdater.fontAsset.pub.isBitmap && data.textUpdater.fontAsset.pub.charset != null;
  }
}

function refreshTables() {
  if (data.textUpdater.fontAsset.pub.isBitmap) {
    ui.fontTable.style.display = "none";
    ui.bitmapTable.style.display = "";
  }
  else {
    ui.bitmapTable.style.display = "none";
    ui.fontTable.style.display = "";
  }
}

// User interface
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

function draw() {
  requestAnimationFrame(draw);

  ui.gameInstance.update();
  ui.gameInstance.draw();
}

start();
