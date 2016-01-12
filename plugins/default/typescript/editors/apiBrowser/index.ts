/// <reference path="../../typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as async from "async";
let hljs = require("highlight.js"); // import * as highlight from "highlight.js";

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
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "BR") index++;
    else if (node.nodeType === Node.TEXT_NODE) {
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

let socket = SupClient.connect(SupClient.query.project);
socket.on("welcome", onWelcome);

function onWelcome(clientId: number, config: { buildPort: number; systemId: string; }) {
  SupClient.fetch(`/systems/${config.systemId}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
      async.series([
        (cb) => {
          let apiScript = document.createElement("script");
          apiScript.src = `/systems/${config.systemId}/plugins/${pluginName}/bundles/typescriptAPI.js`;
          apiScript.addEventListener("load", (event: any) => { cb(null, null); } );
          apiScript.addEventListener("error", (event: any) => { cb(null, null); } );
          document.body.appendChild(apiScript);
        }
      ], pluginCallback);
    }, onAPILoaded);
  });
}

function onAPILoaded() {
  let allDefs: { [pluginName: string]: string } = {};

  let actorComponentAccessors: string[] = [];
  let plugins = SupCore.system.getPlugins<SupCore.TypeScriptAPIPlugin>("typescriptAPI");
  for (let pluginName in plugins) {
    let plugin = plugins[pluginName];
    name = pluginName;
    if (name === "lib") name = "Built-ins";

    if (plugin.exposeActorComponent != null) {
      name = plugin.exposeActorComponent.className;
      actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
    }
    if (plugin.defs != null) allDefs[name] = plugin.defs.replace(/\r\n/g, "\n");
  }

  allDefs["Sup.Actor"] = allDefs["Sup.Actor"].replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));

  let sortedDefNames = Object.keys(allDefs);
  sortedDefNames.sort((a, b) => (a.toLowerCase() < b.toLowerCase()) ? -1 : 1);
  sortedDefNames.unshift(sortedDefNames.splice(sortedDefNames.indexOf("Built-ins"), 1)[0]);

  preElts = [];

  for (let name of sortedDefNames) {
    let defs = allDefs[name];

    let liElt = document.createElement("li");
    navListElt.appendChild(liElt);

    let anchorElt = document.createElement("a");
    anchorElt.id = `link-${name}`;
    anchorElt.href = `#${name}`;
    liElt.appendChild(anchorElt);

    let nameElt = document.createElement("span");
    nameElt.className = "name";
    nameElt.textContent = name;
    anchorElt.appendChild(nameElt);

    let resultsElt = document.createElement("span");
    resultsElt.className = "results";
    anchorElt.appendChild(resultsElt);

    let articleElt = document.createElement("article");
    articleElt.id = `doc-${name}`;
    mainElt.appendChild(articleElt);

    let preElt = document.createElement("pre");

    let content = hljs.highlight("typescript", defs, true).value;
    content = content.replace(/\n/g, "<br>");

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
  searchElt.addEventListener("input", (event) => {
    results = null;
    // Clear result badges
    for (let defName of sortedDefNames) document.getElementById(`link-${defName}`).firstChild.nextSibling.textContent = "";
  });
  searchElt.form.addEventListener("submit", (event) => {
    event.preventDefault();

    let needle = searchElt.value.toLowerCase();
    if (needle.length < 3) return;

    if (results == null) {
      results = [];
      resultIndex = 0;

      for (let i = 0; i < sortedDefNames.length; i++) {
        let defName = sortedDefNames[i];
        let def = allDefs[defName].toLowerCase();
        let preElt = preElts[i];

        if (preElt.parentElement.classList.contains("active")) resultIndex = results.length;

        let resultsCount = 0;
        let targetIndex = -1;
        while (true) {
          targetIndex = def.indexOf(needle, targetIndex + 1);
          if (targetIndex === -1) break;

          let start = findText(preElt, targetIndex);
          let end = findText(preElt, targetIndex + needle.length);
          results.push({ articleElt: preElt.parentElement, start, end });
          resultsCount++;
        }

        // Setup results badge
        (document.getElementById(`link-${defName}`).firstChild.nextSibling as HTMLSpanElement).textContent = resultsCount > 0 ? resultsCount.toString() : "";
      }
    } else resultIndex++;

    resultIndex %= results.length;

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
      let elementNode = result.start.node;
      while (elementNode.nodeType !== elementNode.ELEMENT_NODE) {
        elementNode = (elementNode.nextSibling != null) ? elementNode.nextSibling : elementNode.parentElement;
      }
      let element = elementNode as HTMLElement;
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
    document.getElementById(`doc-${event.target.firstChild.textContent}`).classList.add("active");
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
}

function clearActiveArticle() {
  let activeItem = <HTMLAnchorElement>navListElt.querySelector("li a.active");
  if (activeItem != null) activeItem.classList.remove("active");
  (<HTMLElement>mainElt.querySelector("article.active")).classList.remove("active");
}
