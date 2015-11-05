import * as async from "async";
let highlight = require("highlight.js"); // import * as highlight from "highlight.js";

SupClient.setupHotkeys();

let searchElt = <HTMLInputElement>document.querySelector("input[type=search]");
let noSearchResultsElt = <HTMLElement>document.querySelector("main article");
let navListElt = document.querySelector("nav ul");
let mainElt = document.querySelector("main");
let preElts: HTMLPreElement[];

function findText(containerNode: Node, offset: number) {
  let node = containerNode;
  
  let index = 0;
  while (node != null) {
    if (node.nodeType == Node.TEXT_NODE) {
      let length = (node as Text).data.length;
      if (index + length > offset) return { node, index: offset - index };
      else index += length;
    }

    if (node.hasChildNodes()) node = node.firstChild;
    else if (node === containerNode) return null;
    else if (node.nextSibling != null) node = node.nextSibling;
    else {
      let ancestorNode = node;
      do {
        if (ancestorNode === containerNode) return null;
        ancestorNode = ancestorNode.parentNode;
      } while (ancestorNode.nextSibling == null);
      node = ancestorNode.nextSibling;
    }
  }
}

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
  let allDefs: { [pluginName: string]: string } = {};

  let actorComponentAccessors: string[] = [];
  for (let pluginName in SupAPI.contexts["typescript"].plugins) {
    let plugin = SupAPI.contexts["typescript"].plugins[pluginName];
    name = pluginName;

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

  preElts = [];

  for (let name of sortedDefNames) {
    let defs = allDefs[name];
    if (name === "lib") name = "Built-ins";

    let liElt = document.createElement("li");
    let anchorElt = document.createElement("a");
    anchorElt.id = `link-${name}`;
    anchorElt.href = `#${name}`;
    anchorElt.textContent = name;
    liElt.appendChild(anchorElt);
    navListElt.appendChild(liElt);

    let articleElt = document.createElement("article");
    articleElt.id = `doc-${name}`;
    mainElt.appendChild(articleElt);

    /*let headerElt = document.createElement("header");
    headerElt.textContent = name;
    articleElt.appendChild(headerElt);*/

    let preElt = document.createElement("pre");
    
    let content = highlight.highlight("typescript", defs, true).value
    content = "<div>" + content.replace(/\n\n/g, "\n \n").replace(/\n/g, "</div><div>") + "</div>";
    preElt.innerHTML = content;
    articleElt.appendChild(preElt);
    preElts.push(preElt);
  }

  let results: { articleElt: HTMLElement; start: { node: Node; index: number; }; end: { node: Node; index: number; } }[] = [];
  let resultIndex = 0;

  document.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.keyCode === 70 /* F */) {
      searchElt.focus();
      searchElt.select();
      event.preventDefault();
    }
  });
  searchElt.addEventListener("change", (event) => { results = null; })
  searchElt.form.addEventListener("submit", (event) => {
    event.preventDefault();

    let needle = searchElt.value.toLowerCase();
    if (needle.length === 0) return;

    if (results == null) {
      results = [];
      resultIndex = 0;

      let i = 0;
      for (let i = 0; i < sortedDefNames.length; i++) {
        let def = allDefs[sortedDefNames[i]].toLowerCase().replace(/\n\n/g, " ").replace(/\n/g, "");
        let preElt = preElts[i];

        let targetIndex = -1;
        while(true) {
          targetIndex = def.indexOf(needle, targetIndex + 1);
          if (targetIndex === -1) break;

          let start = findText(preElt, targetIndex);
          let end = findText(preElt, targetIndex + needle.length);
          results.push({ articleElt: preElt.parentElement, start, end });
        }
      }
    } else resultIndex = (resultIndex + 1) % results.length;

    if (results.length > 0) {
      let result = results[resultIndex];
      if (!result.articleElt.classList.contains("active")) {
        clearActiveArticle();
        result.articleElt.classList.add("active");
        document.getElementById(`link-${result.articleElt.id.slice(4)}`).classList.add("active");
      }

      let range = document.createRange();
      range.setStart(result.start.node, result.start.index);
      range.setEnd(result.end.node, result.end.index);
      let selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // Scroll into view if needed
      let element = result.start.node.parentElement;
      let elementRect = element.getBoundingClientRect();
      let containerRect = mainElt.getBoundingClientRect();

      if (elementRect.top < containerRect.top) element.scrollIntoView(true);
      else if (elementRect.bottom > containerRect.bottom) element.scrollIntoView(false); 
    } else {
      clearActiveArticle();
      noSearchResultsElt.classList.add("active");
    }

    searchElt.focus();
  });

  navListElt.addEventListener("click", (event: any) => {
    if (event.target.tagName !== "A") return;

    clearActiveArticle();
    event.target.classList.add("active");
    document.getElementById(`doc-${event.target.textContent}`).classList.add("active");
  });

  if (window.location.hash.length > 1) {
    let hash = window.location.hash.substring(1);
    let articleElt = document.getElementById(`doc-${hash}`);
    if (articleElt != null) {
      articleElt.classList.add("active");
      document.getElementById(`link-${hash}`).classList.add("active");
      return;
    }
  }

  (<HTMLAnchorElement>navListElt.querySelector("li a")).classList.add("active");
  noSearchResultsElt.nextElementSibling.classList.add("active");
});

function clearActiveArticle() {
  let activeItem = <HTMLAnchorElement>navListElt.querySelector("li a.active");
  if (activeItem != null) activeItem.classList.remove("active");
  (<HTMLElement>mainElt.querySelector("article.active")).classList.remove("active");
}
