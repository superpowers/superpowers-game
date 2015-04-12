import SoundAsset = require("../../data/SoundAsset");
import querystring = require("querystring");

var qs = querystring.parse(window.location.search.slice(1));
var info = { projectId: qs.project, assetId: qs.asset };
var data = null;
var ui: {streamingSelect?: HTMLSelectElement; audioElt?: HTMLAudioElement;} = {};
var socket = null;

var start = () => {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  socket.on("edit:assets", onAssetEdited);
  socket.on("trash:assets", SupClient.onAssetTrashed);
  SupClient.setupHotkeys();

  // Main
  ui.audioElt = <HTMLAudioElement>document.querySelector("audio");

  // Upload
  var fileSelect = <HTMLInputElement>document.querySelector("input.file-select");
  fileSelect.addEventListener("change", onFileSelectChange);
  document.querySelector("button.upload").addEventListener("click", () => { fileSelect.click(); } );
  document.querySelector("button.download").addEventListener("click", onDownloadSound);

  // Sidebar
  ui.streamingSelect = <HTMLSelectElement>document.querySelector(".property-streaming");
  ui.streamingSelect.addEventListener("change", (event) => {
    socket.emit("edit:assets", info.assetId, "setProperty", "streaming", event.target["value"] == "true", (err) => {
      if (err != null) alert(err);
    });
  });
}

// Network callbacks
var onConnected = () => {
  data = {};
  socket.emit("sub", "assets", info.assetId, onAssetReceived);
}

var onAssetReceived = (err, asset) => {
  data.asset = new SoundAsset(info.assetId, asset);

  setupSound();
  setupProperty("streaming", data.asset.pub.streaming);
}

var onAssetEdited = (id, command, ...args) => {
  data.asset.__proto__[`client_${command}`].apply(data.asset, args);
  if (onAssetCommands[command] != null) onAssetCommands[command].apply(data.asset, args);
}

// User interface
var onFileSelectChange = (event) => {
  if (event.target.files.length === 0) return;

  var reader = new FileReader();
  reader.onload = (event) => {
    socket.emit("edit:assets", info.assetId, "upload", event.target["result"], (err) => {
      if (err != null) alert(err);
    });
  }
  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
}

var onDownloadSound = () => {
  SupClient.dialogs.prompt("Enter the name of the sound", null, "Sound.wav", "OK", (name) => {
    if (name == null) return;

    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = objectURL;

    // Not supported in IE and Safari
    a["download"] = name;
    a.click();
    document.body.removeChild(a);
  });
}

var objectURL: string;
var setupSound = () => {
  if (objectURL != null) URL.revokeObjectURL(objectURL);

  var typedArray = new Uint8Array(data.asset.pub.sound);
  var blob = new Blob([ typedArray ], {type: "audio"});
  objectURL = URL.createObjectURL(blob);
  ui.audioElt.src = objectURL;
}

var setupProperty = (path, value) => {
  switch(path) {
    case "streaming": ui.streamingSelect.value = value; break;
  }
}

var onAssetCommands = {
  upload: setupSound,
  setProperty: setupProperty
};

// Start
start()
