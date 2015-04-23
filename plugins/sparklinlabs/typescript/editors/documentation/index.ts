import * as async from "async"
SupClient.setupHotkeys();

async.each(SupClient.pluginPaths.all, (pluginName, pluginCallback) => {
  async.series([
    (cb) => {
      let apiScript = document.createElement("script");
      apiScript.src = `/plugins/${pluginName}/api.js`;
      apiScript.addEventListener("load", (event: any) => { cb(null, null); } );
      apiScript.addEventListener("error", (event: any) => { cb(null, null); } );
      document.body.appendChild(apiScript);
    }
  ], pluginCallback);
}, (err) => {

  let navListElt = document.querySelector("nav ul");
  let mainElt = document.querySelector("main");

  let allDefs: {[pluginName: string]: string} = {};

  let actorComponentAccessors: string[] = [];
  for (let pluginName in SupAPI.contexts["typescript"].plugins) {
    let plugin = SupAPI.contexts["typescript"].plugins[pluginName];
    name = pluginName

    if (plugin.exposeActorComponent != null) {
      name = plugin.exposeActorComponent.className;
      actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
    }
    if (plugin.defs != null) allDefs[name] = plugin.defs;
  }

  allDefs["Sup.Actor"] = allDefs["Sup.Actor"].replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));

  let sortedDefNames = Object.keys(allDefs);
  sortedDefNames.sort((a, b) => { return (a.toLowerCase() < b.toLowerCase()) ? -1 : 1 });
  sortedDefNames.unshift(sortedDefNames.splice(sortedDefNames.indexOf("lib"), 1)[0]);

  for (let name of sortedDefNames) {
    let defs = allDefs[name];
    if (name === "lib") name = "Built-ins";

    let liElt = document.createElement("li")
    let anchorElt = document.createElement("a")
    anchorElt.id = `link-${name}`
    anchorElt.href = `#${name}`
    anchorElt.textContent = name
    liElt.appendChild(anchorElt);
    navListElt.appendChild(liElt);

    let sectionElt = document.createElement("section")
    sectionElt.id = `doc-${name}`
    mainElt.appendChild(sectionElt);

    let headerElt = document.createElement("header")
    headerElt.textContent = name
    sectionElt.appendChild(headerElt);

    let preElt = document.createElement("pre")
    preElt.textContent = defs
    sectionElt.appendChild(preElt);
  }

  navListElt.addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    (<any>navListElt.querySelector("li a.active")).classList.remove("active");
    (<any>mainElt.querySelector("section.active")).classList.remove("active");
    event.target.classList.add("active");
    document.getElementById(`doc-${event.target.textContent}`).classList.add("active");
  });

  if (window.location.hash.length > 1) {
    let hash = window.location.hash.substring(1);
    let sectionElt = document.getElementById(`doc-${hash}`)
    if (sectionElt != null) {
      sectionElt.classList.add("active")
      document.getElementById(`link-${hash}`).classList.add("active");
      return;
    }

    window.location.hash = ""
  }

  (<any>navListElt.querySelector("li a")).classList.add("active");
  (<any>mainElt.querySelector("section")).classList.add("active");
});
