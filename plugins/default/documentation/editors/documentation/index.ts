import * as async from "async";
import * as marked from "marked";

let data: {
  projectClient: SupClient.ProjectClient;
};

const socket = SupClient.connect(SupClient.query.project);
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
  SupClient.fetch(`/systems/${SupCore.system.id}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    async.eachSeries(pluginsInfo.list, (pluginName, pluginCallback) => {
      SupClient.activePluginPath = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
      const documentationScript = document.createElement("script");
      documentationScript.src = `${SupClient.activePluginPath}/bundles/documentation.js`;
      documentationScript.addEventListener("load", () => { pluginCallback(); } );
      documentationScript.addEventListener("error", () => { pluginCallback(); } );
      document.body.appendChild(documentationScript);
    }, (err) => { setupDocs(); });
  });
}

const navListElt = document.querySelector("nav ul");
const mainElt =  document.querySelector("main");

function openDocumentation(name: string) {
  (navListElt.querySelector("li a.active") as HTMLAnchorElement).classList.remove("active");
  (mainElt.querySelector("article.active") as HTMLElement).classList.remove("active");
  navListElt.querySelector(`[data-name=${name}]`).classList.add("active");
  document.getElementById(`documentation-${name}`).classList.add("active");
}

function setupDocs() {

  const sortedNames = Object.keys(SupClient.getPlugins<SupClient.DocumentationPlugin>("documentation"));
  sortedNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });

  const language = SupClient.cookies.get("supLanguage");

  sortedNames.forEach((name) => {
    const liElt = document.createElement("li");
    const anchorElt = document.createElement("a");
    anchorElt.dataset["name"] = name;
    anchorElt.href = `#${name}`;
    liElt.appendChild(anchorElt);
    navListElt.appendChild(liElt);

    const articleElt = document.createElement("article");
    articleElt.id = `documentation-${name}`;
    mainElt.appendChild(articleElt);

    function onDocumentationLoaded(content: string) {
      articleElt.innerHTML = marked(content);
      anchorElt.textContent = articleElt.firstElementChild.textContent;

      const linkElts = articleElt.querySelectorAll("a") as NodeListOf<HTMLAnchorElement>;
      if (SupClient.isApp) {
        const electron: GitHubElectron.Electron = (top as any).global.require("electron");
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

    const pluginPath = SupClient.getPlugins<SupClient.DocumentationPlugin>("documentation")[name].path;
    SupClient.fetch(`${pluginPath}/documentation/${name}.${language}.md`, "text", (err, data) => {
      if (err != null) {
        SupClient.fetch(`${pluginPath}/documentation/${name}.en.md`, "text", (err, data) => {
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
