import GameSettingsResource = require("../../data/GameSettingsResource");

var qs = require("querystring").parse(window.location.search.slice(1));
var info = { projectId: qs.project, assetId: qs.asset };
var data: {projectClient?: SupClient.ProjectClient; resource?: GameSettingsResource};
var ui: {[key: string]: HTMLInputElement} = {};
var socket: SocketIOClient.Socket;

var start = () => {
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
var onConnected = () => {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);
  data.projectClient.subResource("gameSettings", resourceSubscriver)
}

var resourceSubscriver = {
  onResourceReceived: (resourceId: string, resource: any) => {
    data.resource = resource;
    for (var setting in resource.pub) {
      ui[`${setting}`].value = resource.pub[setting];
    }
  },
  onResourceEdited: (resourceId: string, command: string, propertyName: string) => {
    ui[`${propertyName}`].value = data.resource.pub[propertyName];
  }
}

start();
