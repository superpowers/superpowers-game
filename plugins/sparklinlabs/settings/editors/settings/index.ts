import * as async from "async";

let data: {
  projectClient: SupClient.ProjectClient;
};

let socket = SupClient.connect(SupClient.query.project);
socket.on("welcome", onWelcome);
socket.on("disconnect", SupClient.onDisconnected);
SupClient.setupHotkeys();

function onWelcome() {
  data = { projectClient: new SupClient.ProjectClient(socket), };
  loadPlugins();
}

function loadPlugins() {
  SupClient.fetch(`/systems/${SupCore.system.name}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
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
  let mainElt = document.querySelector("main");

  let sortedNames = Object.keys(SupClient.plugins["settingsEditors"]);
  sortedNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });

  let createSection = (namespace: string) => {
    let sectionHeaderElt = document.createElement("header");
    sectionHeaderElt.textContent = namespace;
    mainElt.appendChild(sectionHeaderElt);
    let sectionRootElt = document.createElement("div");
    sectionRootElt.classList.add(`namespace-${namespace}`);
    mainElt.appendChild(sectionRootElt);

    return sectionRootElt;
  };

  // Create general section first so we are sure it is displayed above
  createSection("General");

  for (let name of sortedNames) {
    let namespace = SupClient.plugins["settingsEditors"][name].content.namespace;
    let sectionRootElt = mainElt.querySelector(`div.namespace-${namespace}`) as HTMLDivElement;
    if (sectionRootElt == null) sectionRootElt = createSection(namespace);

    let liElt = document.createElement("li");
    let anchorElt = document.createElement("a");
    anchorElt.id = `link-${name}`;
    anchorElt.href = `#${name}`;
    anchorElt.textContent = name;
    liElt.appendChild(anchorElt);

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
    /* tslint:disable:no-unused-expression */
    new settingEditorClass(divElt, data.projectClient);
    /* tslint:enable:no-unused-expression */
  }
}
