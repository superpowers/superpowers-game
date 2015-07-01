import info from "./info";
import { socket, data, scheduleErrorCheck, setNextCompletion } from "./network";

let PerfectResize = require("perfect-resize");

let ui: {
  editor?: TextEditorWidget;
  
  errorPane?: HTMLDivElement;
  errorPaneStatus?: HTMLDivElement;
  errorPaneInfo?: HTMLDivElement;
  errorsTBody?: HTMLTableSectionElement;

  errorCheckTimeout?: number;
  completionTimeout?: number;
  
  infoElement?: HTMLDivElement;
  infoPosition?: { line: number; ch: number; };
  infoTimeout?: number;
} = {};
export default ui;

SupClient.setupHotkeys();
window.addEventListener("message", (event) => {
  if (event.data.type === "activate") ui.editor.codeMirrorInstance.focus();

  if (event.data.line != null && event.data.ch != null)
    ui.editor.codeMirrorInstance.getDoc().setCursor({ line: parseInt(event.data.line), ch: parseInt(event.data.ch) });
});

// Context menu
let nwDispatcher = (<any>window).nwDispatcher;
if (nwDispatcher != null) {
  let gui = nwDispatcher.requireNwGui();

  let menu = new gui.Menu();
  menu.append(new gui.MenuItem({ label: "Cut (Ctrl-X)", click: () => { document.execCommand("cut"); } }));
  menu.append(new gui.MenuItem({ label: "Copy (Ctrl-C)", click: () => { document.execCommand("copy"); } }));
  menu.append(new gui.MenuItem({ label: "Paste (Ctrl-V)", click: () => { document.execCommand("paste"); } }));

  document.querySelector(".text-editor-container").addEventListener("contextmenu", (event: any) => {
    event.preventDefault();
    menu.popup(event.screenX - gui.Window.get().x, event.screenY - gui.Window.get().y);
    return false;
  });
}

// Setup editor
export function setupEditor(clientId: number) {
  let textArea = <HTMLTextAreaElement>document.querySelector(".text-editor");
  ui.editor = new TextEditorWidget(data.projectClient, clientId, textArea, {
    mode: "text/typescript",
    extraKeys: {
      "Ctrl-Space": "autocomplete",
      "Cmd-Space": "autocomplete",
      "Shift-Ctrl-F": () => { onGlobalSearch(); },
      "Shift-Cmd-F": () => { onGlobalSearch(); },
      "F8": () => {
        let cursor = ui.editor.codeMirrorInstance.getDoc().getCursor();
        let token = ui.editor.codeMirrorInstance.getTokenAt(cursor);
        if (token.string === ".") token.start = token.end;

        let start = 0;
        for (let i = 0; i < cursor.line; i++) start += ui.editor.codeMirrorInstance.getDoc().getLine(i).length + 1;
        start += cursor.ch;

        data.typescriptWorker.postMessage({
          type: "getDefinitionAt",
          name: data.fileNamesByScriptId[info.assetId],
          start
        });
      }
    },
    editCallback: onEditText,
    sendOperationCallback: onSendOperation,
    saveCallback: onSaveText
  });

  (<any>ui.editor.codeMirrorInstance).on("keyup", (instance: any, event: any) => {
    clearInfoPopup();

    // Ignore Ctrl, Cmd, Escape, Return, Tab, arrow keys, F8
    if (event.ctrlKey || event.metaKey || [27, 9, 13, 37, 38, 39, 40, 119, 16].indexOf(event.keyCode) !== -1) return;

    // If the completion popup is active, the hint() method will automatically
    // call for more autocomplete, so we don't need to do anything here.
    if ((<any>ui.editor.codeMirrorInstance).state.completionActive != null && (<any>ui.editor.codeMirrorInstance).state.completionActive.active()) return;
    scheduleCompletion();
  });
}

let localVersionNumber = 0;
function onEditText(text: string, origin: string) {
  let localFileName = data.fileNamesByScriptId[info.assetId];
  let localFile = data.files[localFileName];
  localFile.text = text;
  localVersionNumber++;
  localFile.version = `l${localVersionNumber}`;

  // We ignore the initial setValue
  if (origin !== "setValue") {
    data.typescriptWorker.postMessage({ type: "updateFile", fileName: localFileName, text: localFile.text, version: localFile.version });
    scheduleErrorCheck();
  }
}

function onSendOperation(operation: OperationData) {
  socket.emit("edit:assets", info.assetId, "editText", operation, data.asset.document.getRevisionId(), (err: string) => {
    if (err != null) { alert(err); SupClient.onDisconnected(); }
  });
}

// Error pane
ui.errorPane = <HTMLDivElement>document.querySelector(".error-pane");
ui.errorPaneStatus = <HTMLDivElement>ui.errorPane.querySelector(".status");
ui.errorPaneInfo = <HTMLDivElement>ui.errorPaneStatus.querySelector(".info");

ui.errorsTBody = <HTMLTableSectionElement>ui.errorPane.querySelector(".errors tbody");
ui.errorsTBody.addEventListener("click", onErrorTBodyClick);

let errorPaneResizeHandle = new PerfectResize(ui.errorPane, "bottom");
errorPaneResizeHandle.on("drag", () => { ui.editor.codeMirrorInstance.refresh(); });

let errorPaneToggleButton = ui.errorPane.querySelector("button.toggle");
ui.errorPaneStatus.addEventListener("click", (event: any) => {
  if (event.target.tagName === "BUTTON" && event.target.parentElement.className === "draft") return;

  let collapsed = ui.errorPane.classList.toggle("collapsed");
  errorPaneToggleButton.textContent = collapsed ? "+" : "–";
  errorPaneResizeHandle.handleElt.classList.toggle("disabled", collapsed);
  ui.editor.codeMirrorInstance.refresh();
});

export function refreshErrors(errors: Array<{file: string; position: {line: number; character: number;}; length: number; message: string}>) {
  // Remove all previous erros
  for (let textMarker of ui.editor.codeMirrorInstance.getDoc().getAllMarks()) {
    if ((<any>textMarker).className !== "line-error") continue;
    textMarker.clear();
  }

  ui.editor.codeMirrorInstance.clearGutter("line-error-gutter");

  ui.errorsTBody.innerHTML = "";

  if (errors.length === 0) {
    ui.errorPaneInfo.textContent = "No errors";
    ui.errorPaneStatus.classList.remove("has-errors");
    return;
  }

  ui.errorPaneStatus.classList.add("has-errors");

  let selfErrorsCount = 0;
  let lastSelfErrorRow: HTMLTableRowElement = null;

  // Display new ones
  for (let error of errors) {
    let errorRow = document.createElement("tr");
    
    (<any>errorRow.dataset).line = error.position.line;
    (<any>errorRow.dataset).character = error.position.character;

    let positionCell = document.createElement("td");
    positionCell.textContent = (error.position.line + 1).toString();
    errorRow.appendChild(positionCell);

    let messageCell = document.createElement("td");
    messageCell.textContent = error.message;
    errorRow.appendChild(messageCell);

    let scriptCell = document.createElement("td");
    errorRow.appendChild(scriptCell);
    if (error.file !== "") {
      (<any>errorRow.dataset).assetId = data.files[error.file].id;
      scriptCell.textContent = error.file.substring(0, error.file.length - 3);
    } else scriptCell.textContent = "Internal"

    if (error.file !== data.fileNamesByScriptId[info.assetId]) {
      ui.errorsTBody.appendChild(errorRow);
      continue;
    }

    ui.errorsTBody.insertBefore(errorRow, (lastSelfErrorRow != null) ? lastSelfErrorRow.nextElementSibling : ui.errorsTBody.firstChild);
    lastSelfErrorRow = errorRow;
    selfErrorsCount++;

    let line = error.position.line;
    ui.editor.codeMirrorInstance.getDoc().markText(
      { line , ch: error.position.character },
      { line, ch: error.position.character + error.length },
      { className: "line-error" }
    );

    let gutter = document.createElement("div");
    gutter.className = "line-error-gutter";
    gutter.innerHTML = "●";
    ui.editor.codeMirrorInstance.setGutterMarker(line, "line-error-gutter", gutter);
  }

  let otherErrorsCount = errors.length - selfErrorsCount;
  if (selfErrorsCount > 0) {
    if (otherErrorsCount == 0) ui.errorPaneInfo.textContent = `${selfErrorsCount} error${selfErrorsCount > 1 ? "s" : ""}`;
    else ui.errorPaneInfo.textContent = `${selfErrorsCount} error${selfErrorsCount > 1 ? "s" : ""} in this script, ${otherErrorsCount} in other scripts`;
  } else {
    ui.errorPaneInfo.textContent = `${errors.length} error${errors.length > 1 ? "s" : ""} in other scripts`;
  }
}

function onErrorTBodyClick(event: MouseEvent) {
  let target = <HTMLElement>event.target;
  while (true) {
    if (target.tagName === "TBODY") return;
    if (target.tagName === "TR") break;
    target = target.parentElement;
  }

  let assetId: string = (<any>target.dataset).assetId;
  if (assetId == null) return;
  
  let line: string = (<any>target.dataset).line;
  let character: string = (<any>target.dataset).character;

  if (assetId === info.assetId) {
    ui.editor.codeMirrorInstance.getDoc().setCursor({ line: parseInt(line), ch: parseInt(character) });
    ui.editor.codeMirrorInstance.focus();
  } else {
    let origin: string = (<any>window.location).origin;
    if (window.parent != null) window.parent.postMessage({ type: "openEntry", id: assetId, options: { line, ch: character } }, origin);
  }
}

// Save button
let saveButton = ui.errorPane.querySelector(".draft button");
saveButton.addEventListener("click", (event: MouseEvent) => {
  event.preventDefault();
  onSaveText();
});

function onSaveText() {
  socket.emit("edit:assets", info.assetId, "saveText", (err: string) => { if (err != null) { alert(err); SupClient.onDisconnected(); }});
}

// Info popup
ui.infoElement = document.createElement("div");
ui.infoElement.classList.add("popup-info");

document.addEventListener("mouseout", (event) => { clearInfoPopup(); });

let previousMousePosition = { x: -1, y: -1 };
document.addEventListener("mousemove", (event) => {
  // On some systems, Chrome (at least v43) generates
  // spurious "mousemove" events every second or so.
  if (event.clientX === previousMousePosition.x && event.clientY === previousMousePosition.y) return;
  previousMousePosition.x = event.clientX;
  previousMousePosition.y = event.clientY;
  clearInfoPopup();

  ui.infoTimeout = window.setTimeout(() => {
    ui.infoPosition = ui.editor.codeMirrorInstance.coordsChar({ left: event.clientX, top: event.clientY });
    if ((<any>ui.infoPosition).outside) return;

    let token = ui.editor.codeMirrorInstance.getTokenAt(ui.infoPosition);
    let start = 0;
    for (let i = 0; i < ui.infoPosition.line; i++) start += ui.editor.codeMirrorInstance.getDoc().getLine(i).length + 1;
    start += ui.infoPosition.ch;

    ui.infoTimeout = null;
    data.typescriptWorker.postMessage({
      type: "getQuickInfoAt",
      name: data.fileNamesByScriptId[info.assetId],
      start
    });
  }, 200);
});

function clearInfoPopup() {
  if (ui.infoElement.parentElement != null) ui.infoElement.parentElement.removeChild(ui.infoElement);
  if (ui.infoTimeout != null) clearTimeout(ui.infoTimeout);
}

// Completion
(<any>CodeMirror).commands.autocomplete = (cm: CodeMirror.Editor) => { scheduleCompletion(); };

function hint(instance: any, callback: any) {
  let cursor = ui.editor.codeMirrorInstance.getDoc().getCursor();
  let token = ui.editor.codeMirrorInstance.getTokenAt(cursor);
  if (token.string === ".") token.start = token.end;

  let start = 0;
  for (let i = 0; i < cursor.line; i++) start += ui.editor.codeMirrorInstance.getDoc().getLine(i).length + 1;
  start += cursor.ch;

  setNextCompletion({ callback, cursor, token, start });
}
(<any>hint).async = true;

let hintCustomKeys = {
  "Up": (cm: any, commands: any) => { commands.moveFocus(-1); },
  "Down": (cm: any, commands: any) => { commands.moveFocus(1); },
  "Enter": (cm: any, commands: any) => { commands.pick(); },
  "Tab": (cm: any, commands: any) => { commands.pick(); },
  "Esc": (cm: any, commands: any) => { commands.close(); },
};

function scheduleCompletion() {
  if (ui.completionTimeout != null) clearTimeout(ui.completionTimeout);

  ui.completionTimeout = window.setTimeout(() => {
    (<any>ui.editor.codeMirrorInstance).showHint({ completeSingle: false, customKeys: hintCustomKeys, hint });
    ui.completionTimeout = null;
  }, 100);
}

// Global search
function onGlobalSearch() {
  if (window.parent == null) {
    //TODO: find a way so it works ? or display an information saying that you can't ?
    return;
  }

  let selection = ui.editor.codeMirrorInstance.getDoc().getSelection();
  SupClient.dialogs.prompt("Search in all TypeScript scripts.", "Find in project", selection, "Search", (text) => {
    if (text == null) {
      ui.editor.codeMirrorInstance.focus();
      return;
    }
    window.parent.postMessage({ type: "openTool", name: "search", options: { text } }, (<any>window.location).origin);
  });
}
