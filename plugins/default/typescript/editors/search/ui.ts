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
ui.searchInput.addEventListener("keydown", (event: any) => { if (event.keyCode === 13) search(); });

ui.matchCaseCheckbox = <HTMLInputElement>document.getElementById("match-case-checkbox");

document.querySelector(".search button").addEventListener("click", (event: any) => { search(); });
ui.statusSpan = <HTMLSpanElement>document.querySelector(".search span");

window.addEventListener("message", (event: any) => {
  if (event.data.type === "activate") ui.searchInput.focus();
  if (event.data.type === "setState") {
    ui.searchInput.value = event.data.state.text;
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
    refreshGlobalStatus();
    return;
  }

  if (nameElt == null) {
    nameElt = document.createElement("span");
    nameElt.dataset["id"] = assetId;
    ui.resultsPane.appendChild(nameElt);

    nameElt.addEventListener("click", (event: any) => {
      let tableElt = <HTMLTableElement>document.querySelector(`table[data-id='${event.target.dataset["id"]}']`);
      tableElt.classList.toggle("collapsed");
    });
  }
  refreshFileStatus(name, nameElt, results.length);

  if (tableElt == null) {
    tableElt = document.createElement("table");
    tableElt.dataset["id"] = assetId;
    ui.resultsPane.appendChild(tableElt);

    tableElt.addEventListener("click", (event: any) => {
      let target = <HTMLElement>event.target;
      while (true) {
        if (target.tagName === "TBODY") return;
        if (target.tagName === "TR") break;
        target = target.parentElement;
      }

      let id = target.dataset["id"];
      let line = target.dataset["line"];
      let ch = target.dataset["ch"];

      if (window.parent != null) SupClient.openEntry(id, { line, ch });
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
    dataset["id"] = assetId;
    dataset["line"] = line;
    dataset["ch"] = column;

    let lineElt = document.createElement("td");
    rowElt.appendChild(lineElt);
    lineElt.textContent = (line + 1).toString();

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
  refreshGlobalStatus();
}

function refreshGlobalStatus() {
  let resultsCount = 0;
  let filesCount = 0;

  for (let index = 1; index < ui.resultsPane.children.length; index += 2) {
    resultsCount += (<HTMLTableElement>ui.resultsPane.children[index]).children.length;
    filesCount += 1;
  }

  if (resultsCount === 0) ui.statusSpan.textContent = SupClient.i18n.t("searchEditor:noResults");
  else {
    let results = SupClient.i18n.t(`searchEditor:${resultsCount === 1 ? "oneResult" : "severalResults"}`, { results: resultsCount.toString() });
    let files = SupClient.i18n.t(`searchEditor:${filesCount === 1 ? "oneFile" : "severalFiles"}`, { files: filesCount.toString() });
    ui.statusSpan.textContent = SupClient.i18n.t("searchEditor:resultInfo", { results, files });
  }
}

export function refreshFileStatus(fileName: string, nameElt: HTMLSpanElement, count: number) {
  let results = SupClient.i18n.t(`searchEditor:${count === 1 ? "oneResult" : "severalResults"}`, { results: count.toString() });
  nameElt.textContent = SupClient.i18n.t("searchEditor:fileInfo", { results, fileName });
}
