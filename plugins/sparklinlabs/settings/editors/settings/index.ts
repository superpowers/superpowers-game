import * as async from "async";

let data: {
  projectClient: SupClient.ProjectClient;
};

let ui: any = {};

let socket = SupClient.connect(SupClient.query.project);
socket.on("welcome", onWelcome);
socket.on("disconnect", SupClient.onDisconnected);
SupClient.setupHotkeys();

function onWelcome() {
  data = { projectClient: new SupClient.ProjectClient(socket), };
  
  loadPlugins();
}

function loadPlugins() {
  window.fetch(`/systems/${SupCore.system.name}/plugins.json`)
  .then((response) => response.json())
  .then((pluginsInfo: SupCore.PluginsInfo) => {
    async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
      async.series([

        (cb) => {
          let dataScript = document.createElement("script");
          dataScript.src = `/systems/${SupCore.system.name}/plugins/${pluginName}/data.js`;
          dataScript.addEventListener("load", () => { cb(null, null); } );
          dataScript.addEventListener("error", () => { cb(null, null); } );
          document.body.appendChild(dataScript);
        },

        (cb) => {
          SupClient.activePluginPath = `/systems/${SupCore.system.name}/plugins/${pluginName}`;
          let settingsEditorScript = document.createElement("script");
          settingsEditorScript.src = `${SupClient.activePluginPath}/settingsEditors.js`;
          settingsEditorScript.addEventListener("load", () => { cb(null, null); } );
          settingsEditorScript.addEventListener("error", () => { cb(null, null); } );
          document.body.appendChild(settingsEditorScript);
        },

      ], pluginCallback);
    }, (err) => { setupSettings(); });
  });
}

function setupSettings() {
  let navListElt = document.querySelector("nav ul");
  let mainElt = document.querySelector("main");

  let sortedNames = Object.keys(SupClient.plugins["settingsEditors"]);
  sortedNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });

  for (let name of sortedNames) {
    let settingEditorClass = SupClient.plugins["settingsEditors"][name].content;

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

    let divElt = document.createElement("div");
    sectionElt.appendChild(divElt);

    new settingEditorClass(divElt, data.projectClient);
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
