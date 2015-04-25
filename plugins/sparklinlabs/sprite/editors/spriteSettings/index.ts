import SpriteSettingsResource from "../../data/SpriteSettingsResource";

import * as querystring from "querystring";
let qs = querystring.parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset };
let data: {projectClient?: SupClient.ProjectClient; resource?: SpriteSettingsResource};
let ui: {[key: string]: HTMLInputElement} = {};
let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  ui["filtering"] = <HTMLInputElement>document.querySelector("select.filtering");
  ui["filtering"].addEventListener("change", (event: any) => {
    socket.emit("edit:resources", "spriteSettings", "setProperty", "filtering", event.target.value, (err: string) => { if (err != null) alert(err); });
  });

  ui["framesPerSecond"] = <HTMLInputElement>document.querySelector("input.framesPerSecond");
  ui["framesPerSecond"].addEventListener("change", (event: any) => {
    socket.emit("edit:resources", "spriteSettings", "setProperty", "framesPerSecond", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
  });
  ui["pixelsPerUnit"] = <HTMLInputElement>document.querySelector("input.pixelsPerUnit");
  ui["pixelsPerUnit"].addEventListener("change", (event: any) => {
    socket.emit("edit:resources", "spriteSettings", "setProperty", "pixelsPerUnit", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
  });
  ui["alphaTest"] = <HTMLInputElement>document.querySelector("input.alphaTest");
  ui["alphaTest"].addEventListener("change", (event: any) => {
    socket.emit("edit:resources", "spriteSettings", "setProperty", "alphaTest", parseFloat(event.target.value), (err: string) => { if (err != null) alert(err); });
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
    ui[propertyName].value = data.resource.pub[propertyName];
  }
}

function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);
  data.projectClient.subResource("spriteSettings", resourceSubscriber);
}

start();
