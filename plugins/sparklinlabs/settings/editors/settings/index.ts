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
    async.eachSeries(pluginsInfo.list, (pluginName, pluginCallback) => {
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
  let navListElt = document.querySelector("nav ol");
  let mainElt = document.querySelector("main");

  let sortedNames = Object.keys(SupClient.plugins["settingsEditors"]);
  sortedNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });

  let createSection = (namespace: string) => {
    let linkHeaderElt = document.createElement("li");
    linkHeaderElt.textContent = namespace;
    navListElt.appendChild(linkHeaderElt);
    let linkRootElt = document.createElement("ol");
    linkRootElt.classList.add(`namespace-${namespace}`);
    navListElt.appendChild(linkRootElt);

    let sectionHeaderElt = document.createElement("header");
    sectionHeaderElt.textContent = namespace;
    mainElt.appendChild(sectionHeaderElt);
    let sectionRootElt = document.createElement("div");
    sectionRootElt.classList.add(`namespace-${namespace}`);
    mainElt.appendChild(sectionRootElt);

    return { linkRootElt, sectionRootElt };
  };

  // Create general section first so we are sure it is displayed above
  createSection("General");

  for (let name of sortedNames) {
    let namespace = SupClient.plugins["settingsEditors"][name].content.namespace;
    let linkRootElt = navListElt.querySelector(`ol.namespace-${namespace}`) as HTMLOListElement;
    let sectionRootElt = mainElt.querySelector(`div.namespace-${namespace}`) as HTMLDivElement;
    if (linkRootElt == null) {
      let section = createSection(namespace);
      linkRootElt = section.linkRootElt;
      sectionRootElt = section.sectionRootElt;
    }

    let liElt = document.createElement("li");
    let anchorElt = document.createElement("a");
    anchorElt.id = `link-${name}`;
    anchorElt.href = `#${name}`;
    anchorElt.textContent = name;
    liElt.appendChild(anchorElt);
    linkRootElt.appendChild(liElt);

    let sectionElt = document.createElement("section");
    sectionElt.id = `settings-${name}`;
    sectionRootElt.appendChild(sectionElt);

    let headerElt = document.createElement("header");
    let sectionAnchorElt = document.createElement("a");
    sectionAnchorElt.name = name;
    sectionAnchorElt.textContent = name;
    headerElt.appendChild(sectionAnchorElt);
    sectionElt.appendChild(headerElt);

    let divElt = document.createElement("div");
    sectionElt.appendChild(divElt);

    let settingEditorClass = SupClient.plugins["settingsEditors"][name].content.editor;
    new settingEditorClass(divElt, data.projectClient);
  }

  navListElt.addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    (<HTMLAnchorElement>navListElt.querySelector("li a.active")).classList.remove("active");
    event.target.classList.add("active");
  });

  if (window.location.hash.length > 1) {
    let hash = window.location.hash.substring(1);
    let sectionElt = document.getElementById(`settings-${hash}`);
    if (sectionElt != null) {
      sectionElt.scrollIntoView();
      document.getElementById(`link-${hash}`).classList.add("active");
      return;
    }
  }

  (<HTMLAnchorElement>navListElt.querySelector("li a")).classList.add("active");
}
