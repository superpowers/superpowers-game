import SoundAsset from "../../data/SoundAsset";
import * as querystring from "querystring";

let qs = querystring.parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset };
let data: any = null;
let ui: {streamingSelect?: HTMLSelectElement; audioElt?: HTMLAudioElement;} = {};
let socket: SocketIOClient.Socket = null;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  socket.on("edit:assets", onAssetEdited);
  socket.on("trash:assets", SupClient.onAssetTrashed);
  SupClient.setupHotkeys();

  // Main
  ui.audioElt = <HTMLAudioElement>document.querySelector("audio");

  // Upload
  let fileSelect = <HTMLInputElement>document.querySelector("input.file-select");
  fileSelect.addEventListener("change", onFileSelectChange);
  document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); } );
  document.querySelector("button.download").addEventListener("click", onDownloadSound);

  // Sidebar
  ui.streamingSelect = <HTMLSelectElement>document.querySelector(".property-streaming");
  ui.streamingSelect.addEventListener("change", (event) => {
    socket.emit("edit:assets", info.assetId, "setProperty", "streaming", ui.streamingSelect.value === "true", (err: string) => {
      if (err != null) alert(err);
    });
  });
}

// Network callbacks
let onAssetCommands: any = {};

function onConnected() {
  data = {};
  socket.emit("sub", "assets", info.assetId, onAssetReceived);
}

function onAssetReceived(err: string, asset: any) {
  data.asset = new SoundAsset(info.assetId, asset);

  setupSound();
  setupProperty("streaming", data.asset.pub.streaming);
}

function onAssetEdited(id: string, command: string, ...args: any[]) {
  data.asset.__proto__[`client_${command}`].apply(data.asset, args);
  if (onAssetCommands[command] != null) onAssetCommands[command].apply(data.asset, args);
}

// User interface
let objectURL: string;

function onFileSelectChange(event: any) {
  if (event.target.files.length === 0) return;

  let reader = new FileReader();
  reader.onload = (event) => {
    socket.emit("edit:assets", info.assetId, "upload", reader.result, (err: string) => {
      if (err != null) alert(err);
    });
  }
  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

function onDownloadSound() {
  SupClient.dialogs.prompt("Enter the name of the sound", null, "Sound.wav", "OK", (name) => {
    if (name == null) return;

    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = objectURL;

    // Not yet supported in IE and Safari (http://caniuse.com/#feat=download)
    (<any>a).download = name;
    a.click();
    document.body.removeChild(a);
  });
}

function setupSound() {
  if (objectURL != null) URL.revokeObjectURL(objectURL);

  let typedArray = new Uint8Array(data.asset.pub.sound);
  let blob = new Blob([ typedArray ], {type: "audio"});
  objectURL = URL.createObjectURL(blob);
  ui.audioElt.src = objectURL;
}

function setupProperty(path: string, value: any) {
  switch(path) {
    case "streaming": ui.streamingSelect.value = value; break;
  }
}

onAssetCommands.upload = setupSound;
onAssetCommands.setProperty = setupProperty;

// Start
start();
