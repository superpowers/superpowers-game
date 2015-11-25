import * as async from "async";
import * as marked from "marked";

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
  window.fetch(`/systems/${SupCore.system.name}/plugins.json`)
  .then((response) => response.json())
  .then((pluginsInfo: SupCore.PluginsInfo) => {
    async.eachSeries(pluginsInfo.list, (pluginName, pluginCallback) => {
      SupClient.activePluginPath = `/systems/${SupCore.system.name}/plugins/${pluginName}`;
      let documentationScript = document.createElement("script");
      documentationScript.src = `${SupClient.activePluginPath}/documentation.js`;
      documentationScript.addEventListener("load", () => { pluginCallback(); } );
      documentationScript.addEventListener("error", () => { pluginCallback(); } );
      document.body.appendChild(documentationScript);
    }, (err) => { setupDocs(); });
  });
}

function setupDocs() {
  let navListElt = document.querySelector("nav ul");
  let mainElt = document.querySelector("main");

  let sortedNames = Object.keys(SupClient.plugins["documentation"]);
  sortedNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1; });

  let language = window.navigator.language;
  let separatorIndex = language.indexOf("-");
  if (separatorIndex !== -1) language = language.slice(0, separatorIndex);

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
        let shell: GitHubElectron.Shell = (top as any).global.require("remote").require("shell");
        for (let i = 0; i < linkElts.length; i++) {
          linkElts[i].addEventListener("click", (event: any) => {
            event.preventDefault();
            shell.openExternal(event.target.href);
          });
        }
      } else {
        for (let i = 0; i < linkElts.length; i++) linkElts[i].target = "_blank";
      }
    }

    window.fetch(`${SupClient.plugins["documentation"][name].path}/documentation/${name}.${language}.md`)
      .then((response) => {
        if (response.status === 404) {
          window.fetch(`${SupClient.plugins["documentation"][name].path}/documentation/${name}.en.md`)
            .then((response) => response.text() ).then(onDocumentationLoaded);
          return;
        }
        return response.text().then(onDocumentationLoaded);
      });
  });

  navListElt.addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    (<HTMLAnchorElement>navListElt.querySelector("li a.active")).classList.remove("active");
    (<HTMLElement>mainElt.querySelector("article.active")).classList.remove("active");
    event.target.classList.add("active");
    document.getElementById(`documentation-${event.target.dataset["name"]}`).classList.add("active");
  });

  (<HTMLAnchorElement>navListElt.querySelector("li a")).classList.add("active");
  (<HTMLElement>mainElt.querySelector("article")).classList.add("active");
}
