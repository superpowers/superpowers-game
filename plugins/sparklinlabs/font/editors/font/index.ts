import TextRenderer from "../../components/TextRenderer";
import TextRendererUpdater from "../../components/TextRendererUpdater";

let data: { projectClient?: SupClient.ProjectClient; textUpdater?: TextRendererUpdater; };
let ui: {
  gameInstance: SupEngine.GameInstance,

  allSettings: string[],
  settings: { [name: string]: any; }
  colorPicker: HTMLInputElement,
  vectorFontTBody: HTMLTableSectionElement,
  bitmapFontTBody: HTMLTableSectionElement
} = <any>{};
let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(SupClient.query.project);
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
  /* tslint:disable:no-unused-expression */
  new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent, {
    zoomSpeed: 1.5,
    zoomMin: 1,
    zoomMax: 200
  });
  /* tslint:enable:no-unused-expression */

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
        socket.emit("edit:assets", SupClient.query.asset, "setProperty", event.target.dataset.name, event.target.value, (err: string) => { if (err != null) alert(err); });
      });
    } else if (setting === "charset") {
      settingObj.addEventListener("change", (event: any) => {
        let charset = (event.target.value !== "") ? event.target.value : null;
        socket.emit("edit:assets", SupClient.query.asset, "setProperty", event.target.dataset.name, charset, (err: string) => { if (err != null) alert(err); });
      });
    } else if (setting === "isBitmap") {
      settingObj.addEventListener("click", (event: any) => {
        socket.emit("edit:assets", SupClient.query.asset, "setProperty", event.target.dataset.name, event.target.checked, (err: string) => { if (err != null) alert(err); });
      });
    } else {
      settingObj.addEventListener("change", (event: any) => {
        socket.emit("edit:assets", SupClient.query.asset, "setProperty", event.target.dataset.name, parseInt(event.target.value, 10), (err: string) => { if (err != null) alert(err); });
      });
    }
  });

  ui.colorPicker = <HTMLInputElement>document.querySelector("input.color-picker");
  ui.colorPicker.addEventListener("change", (event: any) => {
    socket.emit("edit:assets", SupClient.query.asset, "setProperty", "color", event.target.value.slice(1), (err: string) => { if (err != null) alert(err); });
  });

  ui.vectorFontTBody = <HTMLTableSectionElement>document.querySelector("tbody.vector-font");
  ui.bitmapFontTBody = <HTMLTableSectionElement>document.querySelector("tbody.bitmap-font");

  requestAnimationFrame(draw);
}

// Network callbacks
let onEditCommands: any =  {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  let textActor = new SupEngine.Actor(ui.gameInstance, "Text");
  let textRenderer = new TextRenderer(textActor);
  let config = { fontAssetId: SupClient.query.asset, text: "The quick brown fox jumps over the lazy dog", alignment: "center" };
  let receiveCallbacks = { font: onAssetReceived };
  let editCallbacks = { font: onEditCommands };
  data.textUpdater = new TextRendererUpdater(data.projectClient, textRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived() {
  ui.allSettings.forEach((setting: string) => {
    if(setting === "isBitmap") {
      ui.settings[setting].checked = data.textUpdater.fontAsset.pub.isBitmap;
      refreshFontMode();
    } else {
      ui.settings[setting].value = (<any>data.textUpdater.fontAsset.pub)[setting];
    }
  });

  ui.colorPicker.value = `#${data.textUpdater.fontAsset.pub.color}`;
  ui.settings["charsetOffset"].disabled = data.textUpdater.fontAsset.pub.isBitmap && data.textUpdater.fontAsset.pub.charset != null;
}
onEditCommands.setProperty = (path: string, value: any) => {
  if(path === "isBitmap") {
    ui.settings[path].checked = value;
    refreshFontMode();
  } else ui.settings[path].value = value;

  if (path === "color") ui.colorPicker.value = `#${value}`;
  else if (path === "charset") {
    ui.settings["charsetOffset"].disabled = data.textUpdater.fontAsset.pub.isBitmap && data.textUpdater.fontAsset.pub.charset != null;
  }
};

function refreshFontMode() {
  let fontOrImageString = SupClient.i18n.t(`fontEditor:${data.textUpdater.fontAsset.pub.isBitmap ? "texture" : "font.title"}`);
  document.querySelector(".sidebar .font-or-image th").textContent = fontOrImageString;

  if (data.textUpdater.fontAsset.pub.isBitmap) {
    ui.vectorFontTBody.hidden = true;
    ui.bitmapFontTBody.hidden = false;
  }
  else {
    ui.vectorFontTBody.hidden = false;
    ui.bitmapFontTBody.hidden = true;
  }
}

// User interface
function onFileSelectChange(event: any) {
  if (event.target.files.length === 0) return;

  let reader = new FileReader();
  reader.onload = (event: any) => {
    socket.emit("edit:assets", SupClient.query.asset, "upload", event.target.result, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  };

  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

// Font download
document.querySelector("button.download").addEventListener("click", (event) => {
  function triggerDownload(name: string) {
    let anchor = document.createElement("a");
    document.body.appendChild(anchor);
    anchor.style.display = "none";
    anchor.href = data.textUpdater.fontAsset.url;

    // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
    (anchor as any).download = name + (data.textUpdater.fontAsset.pub.isBitmap ? ".png" : ".woff");
    anchor.click();
    document.body.removeChild(anchor);
  }

  let options = {
    initialValue: SupClient.i18n.t("fontEditor:font.download.defaultName"),
    validationLabel: SupClient.i18n.t("common:actions.download")
  };

  if (SupClient.isApp) {
    triggerDownload(options.initialValue);
  } else {
    /* tslint:disable:no-unused-expression */
    new SupClient.dialogs.PromptDialog(SupClient.i18n.t("fontEditor:font.download.prompt"), options, (name) => {
      /* tslint:enable:no-unused-expression */
      if (name == null) return;
    });
  }
});


function draw() {
  requestAnimationFrame(draw);

  ui.gameInstance.update();
  ui.gameInstance.draw();
}

SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "fontEditor" }], start);
