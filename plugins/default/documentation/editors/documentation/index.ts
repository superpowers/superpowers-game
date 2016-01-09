import * as async from "async";
import * as marked from "marked";

let data: {
  projectClient: SupClient.ProjectClient;
};

let socket = SupClient.connect(SupClient.query.project);
socket.on("welcome", onWelcome);
socket.on("disconnect", SupClient.onDisconnected);
SupClient.setupHotkeys();
let loaded = false;
let initialSection: string;
window.addEventListener("message", (event: any) => {
  if (event.data.type === "setState") {
    if (!loaded) initialSection = event.data.state.section;
    else openDocumentation(event.data.state.section);
  }
});

function onWelcome() {
  data = { projectClient: new SupClient.ProjectClient(socket), };

  loadPlugins();
}

function loadPlugins() {
  SupClient.fetch(`/systems/${SupCore.system.name}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    async.eachSeries(pluginsInfo.list, (pluginName, pluginCallback) => {
      SupClient.activePluginPath = `/systems/${SupCore.system.name}/plugins/${pluginName}`;
      let documentationScript = document.createElement("script");
      documentationScript.src = `${SupClient.activePluginPath}/bundles/documentation.js`;
      documentationScript.addEventListener("load", () => { pluginCallback(); } );
      documentationScript.addEventListener("error", () => { pluginCallback(); } );
      document.body.appendChild(documentationScript);
    }, (err) => { setupDocs(); });
  });
}

let navListElt = document.querySelector("nav ul");
let mainElt =  document.querySelector("main");

function openDocumentation(name: string) {
  (navListElt.querySelector("li a.active") as HTMLAnchorElement).classList.remove("active");
  (mainElt.querySelector("article.active") as HTMLElement).classList.remove("active");
  navListElt.querySelector(`[data-name=${name}]`).classList.add("active");
  document.getElementById(`documentation-${name}`).classList.add("active");
}

function setupDocs() {

  let sortedNames = Object.keys(SupClient.plugins["documentation"]);
  sortedNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });

  let language = SupClient.cookies.get("supLanguage");

  sortedNames.forEach((name) => {
    let liElt = document.createElement("li");
    let anchorElt = document.createElement("a");
    anchorElt.dataset["name"] = name;
    anchorElt.href = `#${name}`;
    liElt.appendChild(anchorElt);
    navListElt.appendChild(liElt);

    let articleElt = document.createElement("article");
    articleElt.id = `documentation-${name}`;
    mainElt.appendChild(articleElt);

    function onDocumentationLoaded(content: string) {
      articleElt.innerHTML = marked(content);
      anchorElt.textContent = articleElt.firstElementChild.textContent;

      let linkElts = articleElt.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>;
      if (SupClient.isApp) {
        let electron: GitHubElectron.Electron = (top as any).global.require("electron");
        for (let i = 0; i < linkElts.length; i++) {
          linkElts[i].addEventListener("click", (event: any) => {
            event.preventDefault();
            electron.shell.openExternal(event.target.href);
          });
        }
      } else {
        for (let i = 0; i < linkElts.length; i++) linkElts[i].target = "_blank";
      }
    }

    SupClient.fetch(`${SupClient.plugins["documentation"][name].path}/documentation/${name}.${language}.md`, "text", (err, data) => {
      if (err != null) {
        SupClient.fetch(`${SupClient.plugins["documentation"][name].path}/documentation/${name}.en.md`, "text", (err, data) => {
          onDocumentationLoaded(data);
        });
        return;
      }
      onDocumentationLoaded(data);
    });
  });

  navListElt.addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;
    openDocumentation(event.target.dataset["name"]);
  });

  (<HTMLAnchorElement>navListElt.querySelector("li a")).classList.add("active");
  (<HTMLElement>mainElt.querySelector("article")).classList.add("active");
  loaded = true;
  if (initialSection != null) openDocumentation(initialSection);
}
