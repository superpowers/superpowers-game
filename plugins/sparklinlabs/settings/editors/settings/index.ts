import * as async from "async";

let qs = require("querystring").parse(window.location.search.slice(1));
let info = { projectId: qs.project };
let data: {
  projectClient: SupClient.ProjectClient;
};

let ui: any = {};

let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();
}

// Network callbacks
function onConnected() {
  data = {
    projectClient: new SupClient.ProjectClient(socket)
  };

  let navListElt = document.querySelector("nav ul");
  let mainElt = document.querySelector("main");

  for (let name in SupClient.settingsEditorClasses) {
     let settingEditorClass = SupClient.settingsEditorClasses[name];

    let liElt = document.createElement("li");
    let anchorElt = document.createElement("a");
    anchorElt.id = `link-${name}`;
    anchorElt.href = `#${name}`;
    anchorElt.textContent = name;
    liElt.appendChild(anchorElt);
    navListElt.appendChild(liElt);

    let sectionElt = document.createElement("section");
    sectionElt.id = `settings-${name}`;
    mainElt.appendChild(sectionElt);

    let headerElt = document.createElement("header");
    headerElt.textContent = name;
    sectionElt.appendChild(headerElt);

    let tableElt = document.createElement("table");
    sectionElt.appendChild(tableElt);

    let tbodyElt = document.createElement("tbody");
    tableElt.appendChild(tbodyElt);

    new settingEditorClass(tbodyElt, data.projectClient);
  }

  navListElt.addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    (<HTMLAnchorElement>navListElt.querySelector("li a.active")).classList.remove("active");
    (<HTMLElement>mainElt.querySelector("section.active")).classList.remove("active");
    event.target.classList.add("active");
    document.getElementById(`settings-${event.target.textContent}`).classList.add("active");
  });

  if (window.location.hash.length > 1) {
    let hash = window.location.hash.substring(1);
    let sectionElt = document.getElementById(`settings-${hash}`);
    if (sectionElt != null) {
      sectionElt.classList.add("active");
      document.getElementById(`link-${hash}`).classList.add("active");
      return;
    }
  }

  (<HTMLAnchorElement>navListElt.querySelector("li a")).classList.add("active");
  (<HTMLElement>mainElt.querySelector("section")).classList.add("active");
}

// Load plugins
async.each(SupClient.pluginPaths.all, (pluginName, pluginCallback) => {
  if (pluginName === "sparklinlabs/settings") { pluginCallback(); return; }

  async.series([

    (cb) => {
      let dataScript = document.createElement("script");
      dataScript.src = `/plugins/${pluginName}/data.js`;
      dataScript.addEventListener("load", () => { cb(null, null); } );
      dataScript.addEventListener("error", () => { cb(null, null); } );
      document.body.appendChild(dataScript);
    },

    (cb) => {
      let settingsEditorScript = document.createElement("script");
      settingsEditorScript.src = `/plugins/${pluginName}/settingsEditors.js`;
      settingsEditorScript.addEventListener("load", () => { cb(null, null); } );
      settingsEditorScript.addEventListener("error", () => { cb(null, null); } );
      document.body.appendChild(settingsEditorScript);
    },

  ], pluginCallback);
}, (err) => {
  // Start
  start()
});
