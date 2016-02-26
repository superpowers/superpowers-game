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
} = {} as any;
let noCharsetText = "The quick brown fox\njumps over the lazy dog\n\n0123456789 +-*/=";

let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  ui.gameInstance = new SupEngine.GameInstance(document.querySelector("canvas") as HTMLCanvasElement);
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
  let fileSelect = document.querySelector("input.file-select") as HTMLInputElement;
  fileSelect.addEventListener("change", onFileSelectChange);
  document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); });

  ui.allSettings = ["isBitmap", "filtering", "pixelsPerUnit", "size", "color", "gridWidth", "gridHeight", "charset", "charsetOffset"];
  ui.settings = {};
  ui.allSettings.forEach((setting: string) => {
    let settingObj: any = ui.settings[setting] = document.querySelector(`.property-${setting}`);
    settingObj.dataset["name"] = setting;

    if (setting === "filtering" || setting === "color") {
      settingObj.addEventListener("change", (event: any) => {
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", event.target.dataset["name"], event.target.value);
      });
    } else if (setting === "charset") {
      settingObj.addEventListener("input", (event: any) => {
        let charset = (event.target.value !== "") ? event.target.value : null;
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", event.target.dataset["name"], charset);
      });
    } else if (setting === "isBitmap") {
      settingObj.addEventListener("change", (event: any) => {
        let isBitmap = event.target.value === "bitmap";
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", event.target.dataset["name"], isBitmap);
      });
    } else {
      settingObj.addEventListener("change", (event: any) => {
        data.projectClient.editAsset(SupClient.query.asset, "setProperty", event.target.dataset["name"], parseInt(event.target.value, 10));
      });
    }
  });

  ui.colorPicker = document.querySelector("input.color-picker") as HTMLInputElement;
  ui.colorPicker.addEventListener("change", (event: any) => {
    data.projectClient.editAsset(SupClient.query.asset, "setProperty", "color", event.target.value.slice(1));
  });

  ui.vectorFontTBody = document.querySelector("tbody.vector-font") as HTMLTableSectionElement;
  ui.bitmapFontTBody = document.querySelector("tbody.bitmap-font") as HTMLTableSectionElement;

  requestAnimationFrame(tick);
}

// Network callbacks
const onEditCommands: { [command: string]: Function; } =  {};
function onConnected() {
  data = { projectClient: new SupClient.ProjectClient(socket) };

  const textActor = new SupEngine.Actor(ui.gameInstance, "Text");
  const textRenderer = new TextRenderer(textActor);
  const config = { fontAssetId: SupClient.query.asset, text: noCharsetText, alignment: "center" };
  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: (assetId, command, ...args) => { if (onEditCommands[command] != null) onEditCommands[command](...args); },
    onAssetTrashed: SupClient.onAssetTrashed
  };
  data.textUpdater = new TextRendererUpdater(data.projectClient, textRenderer, config, subscriber);
}

function onAssetReceived() {
  ui.allSettings.forEach((setting: string) => {
    if (setting === "isBitmap") {
      ui.settings[setting].value = data.textUpdater.fontAsset.pub.isBitmap ? "bitmap" : "vector";
      refreshFontMode();
    } else {
      ui.settings[setting].value = (data.textUpdater.fontAsset.pub as any)[setting];
    }
  });

  if (data.textUpdater.fontAsset.pub.isBitmap && data.textUpdater.fontAsset.pub.charset != null)
    data.textUpdater.config_setProperty("text", data.textUpdater.fontAsset.pub.charset);

  ui.colorPicker.value = `#${data.textUpdater.fontAsset.pub.color}`;
  ui.settings["charsetOffset"].disabled = data.textUpdater.fontAsset.pub.isBitmap && data.textUpdater.fontAsset.pub.charset != null;
}

onEditCommands["setProperty"] = (path: string, value: any) => {
  if (path === "isBitmap") {
    ui.settings[path].value = value ? "bitmap" : "vector";
    if (!value) data.textUpdater.config_setProperty("text", noCharsetText);
    else {
      let charset = data.textUpdater.fontAsset.pub.charset;
      data.textUpdater.config_setProperty("text", charset != null ? charset : noCharsetText);
    }
    refreshFontMode();
  } else ui.settings[path].value = value;

  if (path === "color") ui.colorPicker.value = `#${value}`;
  else if (path === "charset") {
    data.textUpdater.config_setProperty("text", value != null ? value : noCharsetText);
    ui.settings["charsetOffset"].disabled = value != null;
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
    data.projectClient.editAsset(SupClient.query.asset, "upload", event.target.result);
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
    new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("fontEditor:font.download.prompt"), options, (name) => {
      /* tslint:enable:no-unused-expression */
      if (name == null) return;
      triggerDownload(name);
    });
  }
});


let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp = 0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = ui.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) ui.gameInstance.draw();
  requestAnimationFrame(tick);
}

SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "fontEditor" }], start);
