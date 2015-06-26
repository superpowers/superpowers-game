import info from "./info";
import { data } from "./network";

let ui: {
  textToSearch?: string;
  searchRegExp?: RegExp;

  resultsPane?: HTMLDivElement;
  searchInput?: HTMLInputElement;
  matchCaseCheckbox?: HTMLInputElement;
  statusSpan?: HTMLSpanElement;
} = {};
export default ui;

ui.resultsPane = <HTMLDivElement>document.querySelector(".results");

ui.searchInput = <HTMLInputElement>document.querySelector(".search input");
ui.searchInput.focus();
ui.searchInput.addEventListener("keydown", (event: any) => { if (event.keyCode === 13) search(); })

ui.matchCaseCheckbox = <HTMLInputElement>document.getElementById("match-case-checkbox");

document.querySelector(".search button").addEventListener("click", (event: any) => { search(); });
ui.statusSpan = <HTMLSpanElement>document.querySelector(".search span");

// Handle request from another tab
ui.searchInput.value = info.text != null ? info.text : "";
search();

window.addEventListener("message", (event: any) => {
  if (event.data.type === "activate") ui.searchInput.focus();

  if (event.data.text != null) {
    ui.searchInput.value = event.data.text;
    search();
  }
});

function escapeRegExp(text: string) { return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"); }

function search() {
  while (ui.resultsPane.children.length !== 0) {
    let child = <HTMLSpanElement>ui.resultsPane.children[0];
    child.parentElement.removeChild(child);
  }

  ui.searchRegExp = null;
  ui.textToSearch = ui.searchInput.value;

  if (ui.textToSearch.length > 0) {
   ui.searchRegExp = new RegExp(escapeRegExp(ui.textToSearch), `g${ui.matchCaseCheckbox.checked ? "" : "i"}`);
  }

  for (let assetId in data.assetsById) searchAsset(assetId);
}

export function searchAsset(assetId: string) {
  let asset = data.assetsById[assetId];
  let name = data.projectClient.entries.getPathFromId(assetId);

  let results: number[] = [];
  if (ui.searchRegExp != null) {
    let match: any;
    while ((match = ui.searchRegExp.exec(asset.pub.draft)) != null) {
      results.push(match.index);
    }
  }

  let nameElt = <HTMLSpanElement>document.querySelector(`span[data-id='${assetId}']`);
  let tableElt = <HTMLTableElement>document.querySelector(`table[data-id='${assetId}']`);

  if (results.length === 0) {
    if (nameElt != null) nameElt.parentElement.removeChild(nameElt);
    if (tableElt != null) tableElt.parentElement.removeChild(tableElt);
    refreshStatus();
    return;
  }

  if (nameElt == null) {
    nameElt = document.createElement("span");
    (<any>nameElt.dataset).id = assetId;
    ui.resultsPane.appendChild(nameElt);

    nameElt.addEventListener("click", (event: any) => {
      let tableElt = <HTMLTableElement>document.querySelector(`table[data-id='${event.target.dataset.id}']`);
      tableElt.classList.toggle("collapsed");
    });
  }
  nameElt.textContent = `${results.length} result${results.length > 1 ? "s" : ""} in "${name}.ts"`;

  if (tableElt == null) {
    tableElt = document.createElement("table");
    (<any>tableElt.dataset).id = assetId;
    ui.resultsPane.appendChild(tableElt);

    tableElt.addEventListener("click", (event: any) => {
      let target = <HTMLElement>event.target;
      while (true) {
        if (target.tagName === "TBODY") return;
        if (target.tagName === "TR") break;
        target = target.parentElement;
      }

      let id: string = (<any>target.dataset).id;
      let line: string = (<any>target.dataset).line;
      let ch: string = (<any>target.dataset).ch;

      if (window.parent != null)
        window.parent.postMessage({ type: "openEntry", id, options: { line, ch } }, (<any>window.location).origin);
    });

  } else {
    while (tableElt.children.length !== 0) {
      let child = <HTMLTableRowElement>tableElt.children[0];
      child.parentElement.removeChild(child);
    }
  }

  let textParts = asset.pub.draft.split("\n");
  let previousLine = -1;
  let rankInLine: number;
  for (let result of results) {
    let position = 0;
    let line = 0;
    while (position + textParts[line].length <= result) {
      position += textParts[line].length + 1;
      line += 1;
    }

    if (line === previousLine) {
      rankInLine += 1;
    } else {
      previousLine = line;
      rankInLine = 0;
    }

    let column = result - position;

    let rowElt = document.createElement("tr");
    tableElt.appendChild(rowElt);
    let dataset = <any>rowElt.dataset;
    dataset.id = assetId;
    dataset.line = line;
    dataset.ch = column;

    let lineElt = document.createElement("td");
    rowElt.appendChild(lineElt);
    lineElt.textContent = (line+1).toString();

    let textElt = document.createElement("td");
    rowElt.appendChild(textElt);

    let startElt = document.createElement("span");
    startElt.textContent = textParts[line].slice(0, column);
    textElt.appendChild(startElt);

    let wordElt = document.createElement("span");
    wordElt.textContent = textParts[line].slice(column, column + ui.textToSearch.length);
    textElt.appendChild(wordElt);

    let endElt = document.createElement("span");
    endElt.textContent = textParts[line].slice(column + ui.textToSearch.length);
    textElt.appendChild(endElt);
  }
  refreshStatus();
}

function refreshStatus() {
  let results = 0;
  let files = 0;

  for (let index = 1; index < ui.resultsPane.children.length; index += 2) {
    results += (<HTMLTableElement>ui.resultsPane.children[index]).children.length;
    files += 1;
  }

  if (results === 0) ui.statusSpan.textContent = "No results found";
  else {
    let resultPlurial = results > 1 ? "s" : "";
    let filePlurial = files > 1 ? "s" : ""
    ui.statusSpan.textContent = `${results} result${resultPlurial} found in ${files} file${filePlurial}`;
  }
}
