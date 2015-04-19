import TextRenderer = require("../../components/TextRenderer");
import TextRendererUpdater = require("../../components/TextRendererUpdater");

var qs = require("querystring").parse(window.location.search.slice(1));
var info = { projectId: qs.project, assetId: qs.asset };
var data: {projectClient?: SupClient.ProjectClient; textUpdater?: TextRendererUpdater};
var ui: any = {};
var socket: SocketIOClient.Socket;

var start = () => {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  ui.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas"));
  ui.gameInstance.threeRenderer.setClearColor(0xbbbbbb);
  ui.gameInstance.update();
  ui.gameInstance.draw();

  var cameraActor = new SupEngine.Actor(ui.gameInstance, "Camera");
  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 1));
  var cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
  cameraComponent.setOrthographicMode(true);
  cameraComponent.setOrthographicScale(5);
  new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent, {
    zoomSpeed: 1.5,
    zoomMin: 1,
    zoomMax: 60
  });

  // Sidebar
  var fileSelect = <HTMLSelectElement>document.querySelector("input.file-select");
  fileSelect.addEventListener("change", onFileSelectChange);
  document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

  ui.allSettings = ["isBitmap", "filtering", "pixelsPerUnit", "size", "color"]
  ui.settings = {};
  ui.allSettings.forEach((setting: string) => {
    var settingObj: any = ui.settings[setting] = document.querySelector(`.property-${setting}`);
    settingObj.dataset.name = setting;

    if (setting === "isBitmap" || setting === "filtering" || setting === "color") {
      settingObj.addEventListener("change", (event: any) => {
        socket.emit("edit:assets", info.assetId, "setProperty", event.target.dataset.name, event.target.value, (err: string) => { if (err != null) alert(err); });
      });
    }
    else {
      settingObj.addEventListener("change", (event: any) => {
        socket.emit("edit:assets", info.assetId, "setProperty", event.target.dataset.name, parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
      });
    }
  });

  requestAnimationFrame(draw);
}

// Network callbacks
var onEditCommands: any =  {};
var onConnected = () => {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  var textActor = new SupEngine.Actor(ui.gameInstance, "Text");
  var textRenderer = new TextRenderer(textActor);
  var config = { fontAssetId: info.assetId, text: "The quick brown fox jumps over the lazy dog", alignment: "center" };
  var receiveCallbacks = { font: onAssetReceived };
  var editCallbacks = { font: onEditCommands };
  data.textUpdater = new TextRendererUpdater(data.projectClient, textRenderer, config, receiveCallbacks, editCallbacks);
}

var onAssetReceived = () => {
  ui.allSettings.forEach((setting: string) => {
    ui.settings[setting].value = data.textUpdater.fontAsset.pub[setting];
  });
}
onEditCommands.setProperty = (path: string, value: any) => {
  ui.settings[path].value = value;
}

// User interface
var onFileSelectChange = (event: any) => {
  if (event.target.files.length === 0) return;

  var reader = new FileReader();
  reader.onload = (event: any) => {
    socket.emit("edit:assets", info.assetId, "upload", event.target.result, (err: string) => {
      if (err != null) alert(err);
    });
  };

  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

var draw = () => {
  requestAnimationFrame(draw);

  ui.gameInstance.update();
  ui.gameInstance.draw();
}

start();
