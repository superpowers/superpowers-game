/// <reference path="../../typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as async from "async";
/* tslint:disable */
const hljs = require("highlight.js"); // import * as hljs from "highlight.js";
/* tslint:enable */

const searchElt = document.querySelector("input[type=search]") as HTMLInputElement;
const noSearchResultsElt = document.querySelector("main article") as HTMLElement;
const navListElt = document.querySelector("nav ul");
const mainElt = document.querySelector("main");
let preElts: HTMLPreElement[];

function findText(containerNode: Node, offset: number) {
  let node = containerNode;

  let index = 0;
  while (node != null) {
    if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === "BR") index++;
    else if (node.nodeType === Node.TEXT_NODE) {
      const length = (node as Text).data.length;
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

const socket = SupClient.connect(SupClient.query.project);
socket.on("welcome", onWelcome);

function onWelcome(clientId: number, config: { buildPort: number; systemId: string; }) {
  SupClient.fetch(`/systems/${config.systemId}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    async.each(pluginsInfo.list, (pluginName, cb) => {
      SupClient.loadScript(`/systems/${config.systemId}/plugins/${pluginName}/bundles/typescriptAPI.js`, cb);
    }, onAPILoaded);
  });
}

function onAPILoaded() {
  const allDefs: { [pluginName: string]: string } = {};

  const actorComponentAccessors: string[] = [];
  const plugins = SupCore.system.getPlugins<SupCore.TypeScriptAPIPlugin>("typescriptAPI");
  for (const pluginName in plugins) {
    const plugin = plugins[pluginName];
    let name = pluginName;
    if (name === "lib") name = "Built-ins";

    if (plugin.exposeActorComponent != null) {
      name = plugin.exposeActorComponent.className;
      actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
    }
    if (plugin.defs != null) allDefs[name] = plugin.defs.replace(/\r\n/g, "\n");
  }

  allDefs["Sup.Actor"] = allDefs["Sup.Actor"].replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));

  const sortedDefNames = Object.keys(allDefs);
  sortedDefNames.sort((a, b) => (a.toLowerCase() < b.toLowerCase()) ? -1 : 1);
  sortedDefNames.unshift(sortedDefNames.splice(sortedDefNames.indexOf("Built-ins"), 1)[0]);

  preElts = [];

  for (const name of sortedDefNames) {
    const defs = allDefs[name];

    const liElt = document.createElement("li");
    navListElt.appendChild(liElt);

    const anchorElt = document.createElement("a");
    anchorElt.id = `link-${name}`;
    anchorElt.href = `#${name}`;
    liElt.appendChild(anchorElt);

    const nameElt = document.createElement("span");
    nameElt.className = "name";
    nameElt.textContent = name;
    anchorElt.appendChild(nameElt);

    const resultsElt = document.createElement("span");
    resultsElt.className = "results";
    anchorElt.appendChild(resultsElt);

    const articleElt = document.createElement("article");
    articleElt.id = `doc-${name}`;
    mainElt.appendChild(articleElt);

    const preElt = document.createElement("pre");

    const content = hljs.highlight("typescript", defs, true).value.replace(/\n/g, "<br>");

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
    for (const defName of sortedDefNames) document.getElementById(`link-${defName}`).firstChild.nextSibling.textContent = "";
  });
  searchElt.form.addEventListener("submit", (event) => {
    event.preventDefault();

    const needle = searchElt.value.toLowerCase();
    if (needle.length < 3) return;

    if (results == null) {
      results = [];
      resultIndex = 0;

      for (let i = 0; i < sortedDefNames.length; i++) {
        const defName = sortedDefNames[i];
        const def = allDefs[defName].toLowerCase();
        const preElt = preElts[i];

        if (preElt.parentElement.classList.contains("active")) resultIndex = results.length;

        let resultsCount = 0;
        let targetIndex = -1;
        while (true) {
          targetIndex = def.indexOf(needle, targetIndex + 1);
          if (targetIndex === -1) break;

          const start = findText(preElt, targetIndex);
          const end = findText(preElt, targetIndex + needle.length);
          results.push({ articleElt: preElt.parentElement, start, end });
          resultsCount++;
        }

        // Setup results badge
        (document.getElementById(`link-${defName}`).firstChild.nextSibling as HTMLSpanElement).textContent = resultsCount > 0 ? resultsCount.toString() : "";
      }
    } else resultIndex++;

    resultIndex %= results.length;

    if (results.length > 0) {
      const result = results[resultIndex];
      if (!result.articleElt.classList.contains("active")) {
        clearActiveArticle();
        result.articleElt.classList.add("active");
        document.getElementById(`link-${result.articleElt.id.slice(4)}`).classList.add("active");
      }

      const range = document.createRange();
      range.setStart(result.start.node, result.start.index);
      range.setEnd(result.end.node, result.end.index);
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // Scroll into view if needed
      let elementNode = result.start.node;
      while (elementNode.nodeType !== elementNode.ELEMENT_NODE) {
        elementNode = (elementNode.nextSibling != null) ? elementNode.nextSibling : elementNode.parentElement;
      }
      const element = elementNode as HTMLElement;
      const elementRect = element.getBoundingClientRect();
      const containerRect = mainElt.getBoundingClientRect();

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
    const hash = window.location.hash.substring(1);
    const articleElt = document.getElementById(`doc-${hash}`);
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
  const activeItem = <HTMLAnchorElement>navListElt.querySelector("li a.active");
  if (activeItem != null) activeItem.classList.remove("active");
  (<HTMLElement>mainElt.querySelector("article.active")).classList.remove("active");
}
