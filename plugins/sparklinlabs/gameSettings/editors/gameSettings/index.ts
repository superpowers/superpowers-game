import GameSettingsResource from "../../data/GameSettingsResource";

let qs = require("querystring").parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset };
let data: {projectClient?: SupClient.ProjectClient; resource?: GameSettingsResource};
let ui: {[key: string]: HTMLInputElement} = {};
let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  ui["framesPerSecond"] = <HTMLInputElement>document.querySelector("input.framesPerSecond");
  ui["framesPerSecond"].addEventListener("change", (event: any) => {
    socket.emit("edit:resources", "gameSettings", "setProperty", "framesPerSecond", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
  });
  ui["ratioNumerator"] = <HTMLInputElement>document.querySelector("input.ratioNumerator");
  ui["ratioNumerator"].addEventListener("change", (event: any) => {
    socket.emit("edit:resources", "gameSettings", "setProperty", "ratioNumerator", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
  });
  ui["ratioDenominator"] = <HTMLInputElement>document.querySelector("input.ratioDenominator");
  ui["ratioDenominator"].addEventListener("change", (event: any) => {
    socket.emit("edit:resources", "gameSettings", "setProperty", "ratioDenominator", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
  });
}

// Network callbacks
let resourceSubscriber = {
  onResourceReceived: (resourceId: string, resource: any) => {
    data.resource = resource;
    for (let setting in resource.pub) {
      ui[`${setting}`].value = resource.pub[setting];
    }
  },
  onResourceEdited: (resourceId: string, command: string, propertyName: string) => {
    ui[`${propertyName}`].value = data.resource.pub[propertyName];
  }
}

function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);
  data.projectClient.subResource("gameSettings", resourceSubscriber);
}

start();
