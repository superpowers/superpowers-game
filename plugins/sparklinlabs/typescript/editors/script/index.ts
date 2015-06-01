import * as async from "async";
import * as OT from "operational-transform";
import * as ts from "typescript";

import ScriptAsset from "../../data/ScriptAsset";

(<any>window).CodeMirror = require("codemirror");
require("codemirror/addon/search/search");
require("codemirror/addon/search/searchcursor");
require("codemirror/addon/edit/closebrackets");
require("codemirror/addon/comment/comment");
require("codemirror/addon/hint/show-hint");
require("codemirror/addon/selection/active-line");
require("codemirror/keymap/sublime");
require("codemirror/mode/javascript/javascript");

let PerfectResize = require("perfect-resize");

let qs = require("querystring").parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset, line: qs.line, ch: qs.ch };
let data: { clientId: number; projectClient?: SupClient.ProjectClient; assetsById?: {[id: string]: ScriptAsset}; asset?: ScriptAsset; };
let ui: {
  editor?: CodeMirror.EditorFromTextArea;
  tmpCodeMirrorDoc?: CodeMirror.Doc;
  errorPane?: HTMLDivElement;
  errorPaneStatus?: HTMLDivElement;
  errorPaneInfo?: HTMLDivElement;
  errorsTBody?: HTMLTableSectionElement;

  undoTimeout?: number;
  errorCheckTimeout?: number;
  completionTimeout?: number;
  texts?: string[];

  undoStack?: OT.TextOperation[];
  undoQuantityByAction?: number[];
  redoStack?: OT.TextOperation[];
  redoQuantityByAction?: number[];

  infoElement?: HTMLDivElement;
  infoPosition?: CodeMirror.Position;
  infoTimeout?: number;

  sentOperation?: OT.TextOperation;
  pendingOperation?: OT.TextOperation;
} = {};
let socket: SocketIOClient.Socket;


let typescriptWorker = new Worker("typescriptWorker.js");
let fileNames: string[] = [];
let files: { [name: string]: { id: string; text: string; version: string; } } = {};
let fileNamesByScriptId: { [name: string]: string } = {};

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("welcome", onWelcome);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  window.addEventListener("message", (event) => {
    if (event.data.type === "activate") ui.editor.focus();

    if (event.data.line != null && event.data.ch != null)
      ui.editor.getDoc().setCursor({ line: parseInt(event.data.line), ch: parseInt(event.data.ch) });
  });

  let extraKeys = {
    "F9": () => {},
    "Tab": (cm: any) => {
      if (cm.getSelection() !== "") cm.execCommand("indentMore");
      else cm.replaceSelection(Array(cm.getOption("indentUnit") + 1).join(" "));
    },
    "Cmd-X": () => { document.execCommand("cut"); },
    "Cmd-C": () => { document.execCommand("copy"); },
    "Cmd-V": () => { document.execCommand("paste"); },
    "Ctrl-Z": () => { onUndo(); },
    "Cmd-Z": () => { onUndo(); },
    "Shift-Ctrl-Z": () => { onRedo(); },
    "Shift-Cmd-Z": () => { onRedo(); },
    "Ctrl-Y": () => { onRedo(); },
    "Cmd-Y": () => { onRedo(); },
    "Ctrl-S": () => {
      socket.emit("edit:assets", info.assetId, "saveText", (err: string) => { if (err != null) { alert(err); SupClient.onDisconnected(); }});
    },
    "Cmd-S": () => {
      socket.emit("edit:assets", info.assetId, "saveText", (err: string) => { if (err != null) { alert(err); SupClient.onDisconnected(); }});
    },
    "Ctrl-Space": "autocomplete",
    "Cmd-Space": "autocomplete"
  }

  let textArea = <HTMLTextAreaElement>document.querySelector(".code-editor");
  ui.editor = CodeMirror.fromTextArea(textArea, {
    lineNumbers: true, matchBrackets: true, styleActiveLine: true, autoCloseBrackets: true,
    gutters: ["line-error-gutter", "CodeMirror-linenumbers"],
    tabSize: 2, keyMap: "sublime", // , theme: "monokai"
    extraKeys: extraKeys,
    viewportMargin: Infinity,
    mode: "text/typescript",
    readOnly: true
  });

  ui.tmpCodeMirrorDoc = new CodeMirror.Doc("");
  ui.texts = [];

  ui.undoStack = [];
  ui.undoQuantityByAction = [0];
  ui.redoStack = [];
  ui.redoQuantityByAction = [];

  ui.editor.on("beforeChange", (instance: CodeMirror.Editor, change: any) => {
    if (change.origin === "setValue" || change.origin === "network") return;
    let lastText = instance.getDoc().getValue();
    if (lastText !== ui.texts[ui.texts.length - 1]) ui.texts.push(lastText);
  });

  (<any>ui.editor).on("changes", onEditText);

  (<any>CodeMirror).commands.autocomplete = (cm: CodeMirror.Editor) => { scheduleCompletion(); };

  (<any>ui.editor).on("keyup", (instance: any, event: any) => {
    clearInfoPopup();

    // Ignore Ctrl, Cmd, Escape, Return, Tab, arrow keys
    if (event.ctrlKey || event.metaKey || [27, 9, 13, 37, 38, 39, 40, 16].indexOf(event.keyCode) !== -1) return;

    // If the completion popup is active, the hint() method will automatically
    // call for more autocomplete, so we don't need to do anything here.
    if ((<any>ui.editor).state.completionActive != null && (<any>ui.editor).state.completionActive.active()) return;
    scheduleCompletion();
  });

  ui.infoElement = document.createElement("div");
  ui.infoElement.classList.add("popup-info");

  document.onmouseout = (event) => { clearInfoPopup(); }
  document.onmousemove = (event) => {
    clearInfoPopup();

    ui.infoTimeout = window.setTimeout(() => {
      ui.infoPosition = ui.editor.coordsChar({ left: event.clientX, top: event.clientY });
      if ((<any>ui.infoPosition).outside) return;

      let token = ui.editor.getTokenAt(ui.infoPosition);
      let start = 0;
      for (let i = 0; i < ui.infoPosition.line; i++) start += ui.editor.getDoc().getLine(i).length + 1;
      start += ui.infoPosition.ch;

      ui.infoTimeout = null;
      typescriptWorker.postMessage({
        type: "getQuickInfoAt",
        name: fileNamesByScriptId[info.assetId],
        start
      });
    }, 200);
  };

  let nwDispatcher = (<any>window).nwDispatcher;
  if (nwDispatcher != null) {
    let gui = nwDispatcher.requireNwGui();

    let menu = new gui.Menu();
    menu.append(new gui.MenuItem({ label: "Cut (Ctrl-X)", click: () => { document.execCommand("cut"); } }));
    menu.append(new gui.MenuItem({ label: "Copy (Ctrl-C)", click: () => { document.execCommand("copy"); } }));
    menu.append(new gui.MenuItem({ label: "Paste (Ctrl-V)", click: () => { document.execCommand("paste"); } }));

    document.querySelector(".code-editor-container").addEventListener("contextmenu", (event: any) => {
      event.preventDefault();
      menu.popup(event.screenX - gui.Window.get().x, event.screenY - gui.Window.get().y);
      return false;
    });
  }

  // Error pane
  ui.errorPane = <HTMLDivElement>document.querySelector(".error-pane");
  ui.errorPaneStatus = <HTMLDivElement>ui.errorPane.querySelector(".status");
  ui.errorPaneInfo = <HTMLDivElement>ui.errorPaneStatus.querySelector(".info");

  ui.errorsTBody = <HTMLTableSectionElement>ui.errorPane.querySelector(".errors tbody");
  ui.errorsTBody.addEventListener("click", onErrorTBodyClick);

  let errorPaneResizeHandle = new PerfectResize(ui.errorPane, "bottom");
  errorPaneResizeHandle.on("drag", () => { ui.editor.refresh(); });

  let errorPaneToggleButton = ui.errorPane.querySelector("button.toggle");

  ui.errorPaneStatus.addEventListener("click", () => {
    let collapsed = ui.errorPane.classList.toggle("collapsed");
    errorPaneToggleButton.textContent = collapsed ? "+" : "–";
    errorPaneResizeHandle.handleElt.classList.toggle("disabled", collapsed);
    ui.editor.refresh();
  });

  ui.editor.focus();
}

// Network callbacks
function onWelcome(clientId: number) {
  data = { clientId, assetsById: {} }
  data.projectClient = new SupClient.ProjectClient(socket);
  data.projectClient.subEntries(entriesSubscriber);
}

var entriesSubscriber = {
  onEntriesReceived: (entries: SupCore.data.Entries) => {
    entries.walk((entry) => {
      if (entry.type !== "script") return;

      var scriptName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
      fileNames.push(scriptName);
      fileNamesByScriptId[entry.id] = scriptName;
      data.projectClient.subAsset(entry.id, "script", scriptSubscriber);
    })
  },

  onEntryAdded: (newEntry: any, parentId: string, index: number) => {
    if (newEntry.type !== "script") return;

    let scriptName = `${data.projectClient.entries.getPathFromId(newEntry.id)}.ts`;

    let i = 0;
    data.projectClient.entries.walk((entry) => {
      if (entry.type !== "script") return;
      if (entry.id === newEntry.id) fileNames.splice(i, 0, scriptName);
      i++;
    });
    fileNamesByScriptId[newEntry.id] = scriptName;
    data.projectClient.subAsset(newEntry.id, "script", scriptSubscriber);
  },

  onEntryMoved: (id: string, parentId: string, index: number) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script") return;

    let oldFileName = fileNamesByScriptId[id];

    let newFileName = `${data.projectClient.entries.getPathFromId(id)}.ts`;

    fileNames.splice(fileNames.indexOf(oldFileName), 1);
    let i = 0;
    data.projectClient.entries.walk((entry) => {
      if (entry.type !== "script") return;
      if (entry.id === id) fileNames.splice(i, 0, newFileName);
      i++;
    });

    fileNamesByScriptId[id] = newFileName;
    let file = files[oldFileName];
    files[newFileName] = file;
    if (newFileName !== oldFileName) delete files[oldFileName];

    typescriptWorker.postMessage({ type: "removeFile", fileName: oldFileName });
    typescriptWorker.postMessage({ type: "addFile", fileName: newFileName, index: fileNames.indexOf(newFileName), file });
    scheduleErrorCheck();
  },

  onSetEntryProperty: (id: string, key: string, value: any) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script" || key !== "name") return;

    let oldScriptName = fileNamesByScriptId[id];
    let newScriptName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
    if (newScriptName === oldScriptName) return;

    let scriptIndex = fileNames.indexOf(oldScriptName);
    fileNames[scriptIndex] = newScriptName;
    fileNamesByScriptId[id] = newScriptName;
    files[newScriptName] = files[oldScriptName];
    delete files[oldScriptName];
  },

  onEntryTrashed: (id: string) => {
    let fileName = fileNamesByScriptId[id];
    if (fileName == null) return;

    fileNames.splice(fileNames.indexOf(fileName), 1);
    delete files[fileName];
    delete fileNamesByScriptId[id];

    typescriptWorker.postMessage({ type: "removeFile", fileName });
    scheduleErrorCheck();
  },
}

let allScriptsReceived = false;

var scriptSubscriber = {
  onAssetReceived: (err: string, asset: ScriptAsset) => {
    data.assetsById[asset.id] = asset;
    let fileName = `${data.projectClient.entries.getPathFromId(asset.id)}.ts`;
    let file = { id: asset.id, text: asset.pub.text, version: asset.pub.revisionId.toString() }
    files[fileName] = file;

    if (asset.id === info.assetId) {
      data.asset = asset;

      ui.editor.getDoc().setValue(data.asset.pub.draft);
      ui.editor.getDoc().clearHistory();
      ui.editor.setOption("readOnly", false);
      if (info.line != null) ui.editor.getDoc().setCursor({ line: parseInt(info.line), ch: parseInt(info.ch) });
    }

    if (!allScriptsReceived) {
      if (Object.keys(files).length === fileNames.length) {
        allScriptsReceived = true;
        typescriptWorker.postMessage({ type: "setup", fileNames, files });
        scheduleErrorCheck();
      }
    } else {
      // All scripts have been received so this must be a newly created script
      typescriptWorker.postMessage({ type: "addFile", fileName, index: fileNames.indexOf(fileName), file });
      scheduleErrorCheck();
    }
  },

  onAssetEdited: (id: string, command: string, ...args: any[]) => {
    if (id !== info.assetId) {
      if (command === "saveText") {
        let fileName = `${data.projectClient.entries.getPathFromId(id)}.ts`;
        let asset = data.assetsById[id];
        let file = files[fileName];
        file.text = asset.pub.text;
        file.version = asset.pub.revisionId.toString();

        typescriptWorker.postMessage({ type: "updateFile", fileName, text: file.text, version: file.version });
        scheduleErrorCheck();
      }
      return
    }

    if (onAssetCommands[command] != null) onAssetCommands[command].apply(data.asset, args);
  },

  onAssetTrashed: (id: string) => {
    if (id !== info.assetId) return;

    if (ui.undoTimeout != null) clearTimeout(ui.undoTimeout);
    if (ui.errorCheckTimeout != null) clearTimeout(ui.errorCheckTimeout);
    if (ui.completionTimeout != null) clearTimeout(ui.completionTimeout);
    SupClient.onAssetTrashed();
  },
}

var onAssetCommands: any = {};
onAssetCommands.editText = (operationData: OT.OperationData) => {
  if (data.clientId === operationData.userId) {
    if (ui.pendingOperation != null) {
      socket.emit("edit:assets", info.assetId, "editText", ui.pendingOperation.serialize(), data.asset.document.operations.length, (err: string) => {
        if (err != null) { alert(err); SupClient.onDisconnected(); }
      });

      ui.sentOperation = ui.pendingOperation;
      ui.pendingOperation = null;
    } else ui.sentOperation = null;
    return;
  }

  // Transform operation and local changes
  let operation = new OT.TextOperation();
  operation.deserialize(operationData);

  if (ui.sentOperation != null) {
    [ui.sentOperation, operation] = ui.sentOperation.transform(operation);

    if (ui.pendingOperation != null) [ui.pendingOperation, operation] = ui.pendingOperation.transform(operation);
  }
  ui.undoStack = transformStack(ui.undoStack, operation);
  ui.redoStack = transformStack(ui.redoStack, operation);

  applyOperation(operation.clone(), "network", false);
}

function transformStack(stack: OT.TextOperation[], operation: OT.TextOperation) {
  if (stack.length === 0) return stack;

  let newStack: OT.TextOperation[] = [];
  for (let i = stack.length - 1; i > 0; i--) {
    let pair = stack[i].transform(operation);
    newStack.push(pair[0]);
    operation = pair[1];
  }
  return newStack.reverse();
}

function applyOperation(operation: OT.TextOperation, origin: string, moveCursor: boolean) {
  let cursorPosition = 0;
  let line = 0;
  for (let op of operation.ops) {
    switch (op.type) {
      case "retain": {
        while (true) {
          if (op.attributes.amount <= ui.editor.getDoc().getLine(line).length - cursorPosition) break;

          op.attributes.amount -= ui.editor.getDoc().getLine(line).length + 1 - cursorPosition;
          cursorPosition = 0;
          line++;
        }

        cursorPosition += op.attributes.amount;
        break;
      }
      case "insert": {
        let cursor = ui.editor.getDoc().getCursor();

        let texts = op.attributes.text.split("\n");
        for (let textIndex = 0; textIndex < texts.length; textIndex++) {
          let text = texts[textIndex];
          if (textIndex !== texts.length - 1) text += "\n";
          (<any>ui.editor).replaceRange(text, { line, ch: cursorPosition }, null, origin);
          cursorPosition += text.length;

          if (textIndex !== texts.length - 1) {
            cursorPosition = 0;
            line++;
          }
        }

        if (line === cursor.line && cursorPosition === cursor.ch) {
          if (! operation.gotPriority(data.clientId)) {
            for (let i = 0; i < op.attributes.text.length; i++) (<any>ui.editor).execCommand("goCharLeft");
          }
        }

        if (moveCursor) (<any>ui.editor).setCursor(line, cursorPosition);
        break;
      }
      case "delete": {
        let texts = op.attributes.text.split("\n");

        for (let textIndex = 0; textIndex < texts.length; textIndex++) {
          let text = texts[textIndex];
          if (texts[textIndex + 1] != null) (<any>ui.editor).replaceRange("", { line, ch: cursorPosition }, { line: line + 1, ch: 0 }, origin);
          else (<any>ui.editor).replaceRange("", { line, ch: cursorPosition }, { line, ch: cursorPosition + text.length }, origin);

          if (moveCursor) (<any>ui.editor).setCursor(line, cursorPosition);
        }
        break;
      }
    }
  }
}

function clearInfoPopup() {
  if (ui.infoElement.parentElement != null) ui.infoElement.parentElement.removeChild(ui.infoElement);
  if (ui.infoTimeout != null) clearTimeout(ui.infoTimeout);
}

let isCheckingForErrors: boolean = false;
let hasScheduledErrorCheck: boolean = false;

interface CompletionRequest {
  callback: any;
  cursor: any;
  token: any;
  start: any;
}

let activeCompletion: CompletionRequest;
let nextCompletion: CompletionRequest;

typescriptWorker.onmessage = (event: MessageEvent) => {
  switch(event.data.type) {
    case "errors":
      refreshErrors(event.data.errors);
      isCheckingForErrors = false;
      if (hasScheduledErrorCheck) startErrorCheck();
      break;

    case "completion":
      if (nextCompletion != null) {
        activeCompletion = null;
        startAutocomplete();
        return;
      }

      for (let item of event.data.list) {
        item.render = (parentElt: HTMLDivElement, data: any, item: { kind: string; name: string; info: string }) => {
          parentElt.style.maxWidth = "100em";

          let rowElement = document.createElement("div");
          rowElement.style.display = "flex";
          parentElt.appendChild(rowElement);

          let kindElement = document.createElement("div");
          kindElement.style.marginRight = "0.5em";
          kindElement.style.width = "6em";
          kindElement.textContent = item.kind;
          rowElement.appendChild(kindElement);

          let nameElement = document.createElement("div");
          nameElement.style.marginRight = "0.5em";
          nameElement.style.width = "15em";
          nameElement.style.fontWeight = "bold";
          nameElement.textContent = item.name;
          rowElement.appendChild(nameElement);

          let infoElement = document.createElement("div");
          infoElement.textContent = item.info;
          rowElement.appendChild(infoElement);
        };
      }
      let from = (<any>CodeMirror).Pos(activeCompletion.cursor.line, activeCompletion.token.start);
      let to = (<any>CodeMirror).Pos(activeCompletion.cursor.line, activeCompletion.token.end);
      activeCompletion.callback({ list: event.data.list, from, to });
      activeCompletion = null;
      break;

    case "quickInfo":
      if (ui.infoTimeout == null) {
        ui.infoElement.textContent = event.data.text;
        ui.editor.addWidget(ui.infoPosition, ui.infoElement, false)
      }
      /*if (token.string !== "" && token.string !== " ") {

      }*/
      break;
  }
};

function startErrorCheck() {
  if (isCheckingForErrors) return;

  isCheckingForErrors = true;
  hasScheduledErrorCheck = false;
  typescriptWorker.postMessage({ type: "checkForErrors" });
}

function scheduleErrorCheck() {
  if (ui.errorCheckTimeout != null) clearTimeout(ui.errorCheckTimeout);

  ui.errorCheckTimeout = window.setTimeout(() => {
    hasScheduledErrorCheck = true;
    if (!isCheckingForErrors) startErrorCheck();
  }, 300);
}

function startAutocomplete() {
  if (activeCompletion != null) return;

  activeCompletion = nextCompletion;
  nextCompletion = null;

  typescriptWorker.postMessage({
    type: "getCompletionAt",
    tokenString: activeCompletion.token.string,
    name: fileNamesByScriptId[info.assetId],
    start: activeCompletion.start
  });
}

// User interface
function refreshErrors(errors: Array<{file: string; position: {line: number; character: number;}; length: number; message: string}>) {
  // Remove all previous erros
  for (let textMarker of ui.editor.getDoc().getAllMarks()) {
    if ((<any>textMarker).className !== "line-error") continue;
    textMarker.clear();
  }

  ui.editor.clearGutter("line-error-gutter");

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
    (<any>errorRow.dataset).assetId = files[error.file].id;
    (<any>errorRow.dataset).line = error.position.line;
    (<any>errorRow.dataset).character = error.position.character;

    let positionCell = document.createElement("td");
    positionCell.textContent = (error.position.line + 1).toString();
    errorRow.appendChild(positionCell);

    let messageCell = document.createElement("td");
    messageCell.textContent = error.message;
    errorRow.appendChild(messageCell);

    let scriptCell = document.createElement("td");
    scriptCell.textContent = error.file.substring(0, error.file.length - 3);
    errorRow.appendChild(scriptCell);

    if (error.file !== fileNamesByScriptId[info.assetId]) {
      ui.errorsTBody.appendChild(errorRow);
      continue;
    }

    ui.errorsTBody.insertBefore(errorRow, (lastSelfErrorRow != null) ? lastSelfErrorRow.nextElementSibling : ui.errorsTBody.firstChild);
    lastSelfErrorRow = errorRow;
    selfErrorsCount++;

    let line = error.position.line;
    ui.editor.getDoc().markText(
      { line , ch: error.position.character },
      { line, ch: error.position.character + error.length },
      { className: "line-error" }
    );

    let gutter = document.createElement("div");
    gutter.className = "line-error-gutter";
    gutter.innerHTML = "●";
    ui.editor.setGutterMarker(line, "line-error-gutter", gutter);
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
  let line: string = (<any>target.dataset).line;
  let character: string = (<any>target.dataset).character;

  if (assetId === info.assetId) {
    ui.editor.getDoc().setCursor({ line: parseInt(line), ch: parseInt(character) });
    ui.editor.focus();
  } else {
    let origin: string = (<any>window.location).origin;
    if (window.parent != null) window.parent.postMessage({ type: "openEntry", id: assetId, options: { line, ch: character } }, origin);
  }
}

let localVersionNumber = 0;
function onEditText(instance: CodeMirror.Editor, changes: CodeMirror.EditorChange[]) {
  let localFileName = fileNamesByScriptId[info.assetId];
  let localFile = files[localFileName];
  localFile.text = ui.editor.getDoc().getValue();
  localVersionNumber++;
  localFile.version = `l${localVersionNumber}`;

  // We ignore the initial setValue
  if ((<any>changes[0]).origin !== "setValue") {
    typescriptWorker.postMessage({ type: "updateFile", fileName: localFileName, text: localFile.text, version: localFile.version });
    scheduleErrorCheck();
  }

  let undoRedo = false;
  let operationToSend: OT.TextOperation;
  for (let changeIndex = 0; changeIndex < changes.length; changeIndex++) {
    let change = changes[changeIndex];
    let origin: string = (<any>change).origin;

    // Modification from an other person
    if (origin === "setValue" || origin ==="network") continue;

    ui.tmpCodeMirrorDoc.setValue(ui.texts[changeIndex]);

    let operation = new OT.TextOperation(data.clientId);
    for (let line = 0; line < change.from.line; line++) operation.retain(ui.tmpCodeMirrorDoc.getLine(line).length + 1);
    operation.retain(change.from.ch);

    let offset = 0;
    if (change.removed.length !== 1 || change.removed[0] !== "") {
      for (let index = 0; index < change.removed.length; index++) {
        let text = change.removed[index];
        if (index !== 0) {
          operation.delete("\n");
          offset += 1;
        }

        operation.delete(text);
        offset += text.length;
      }
    }

    if (change.text.length !== 1 || change.text[0] !== "") {
      for (let index = 0; index < change.text.length; index++) {
        if (index !== 0) operation.insert("\n");
        operation.insert(change.text[index]);
      }
    }

    let beforeLength = (operation.ops[0].attributes.amount != null) ? operation.ops[0].attributes.amount : 0;
    operation.retain(ui.tmpCodeMirrorDoc.getValue().length - beforeLength - offset);

    if (operationToSend == null) operationToSend = operation.clone();
    else operationToSend = operationToSend.compose(operation);

    if (origin === "undo" || origin === "redo") undoRedo = true;
  }

  ui.texts.length = 0;
  if (operationToSend == null) return;

  if (! undoRedo) {
    if (ui.undoTimeout != null) {
      clearTimeout(ui.undoTimeout);
      ui.undoTimeout = null;
    }

    ui.undoStack.push(operationToSend.clone().invert());
    ui.undoQuantityByAction[ui.undoQuantityByAction.length - 1] += 1;
    if (ui.undoQuantityByAction[ui.undoQuantityByAction.length - 1] > 20) ui.undoQuantityByAction.push(0);
    else {
      ui.undoTimeout = window.setTimeout(() => {
        ui.undoTimeout = null;
        ui.undoQuantityByAction.push(0);
      }, 500);
    }

    ui.redoStack.length = 0;
    ui.redoQuantityByAction.length = 0;
  }

  if (ui.sentOperation == null) {
    socket.emit("edit:assets", info.assetId, "editText", operationToSend.serialize(), data.asset.document.operations.length, (err: string) => {
      if (err != null) { alert(err); SupClient.onDisconnected(); }
    });

    ui.sentOperation = operationToSend;
  } else {
    if (ui.pendingOperation != null) ui.pendingOperation = ui.pendingOperation.compose(operationToSend);
    else ui.pendingOperation = operationToSend;
  }
}

function hint(instance: any, callback: any) {
  let cursor = ui.editor.getDoc().getCursor();
  let token = ui.editor.getTokenAt(cursor);
  if (token.string === ".") token.start = token.end;

  let start = 0;
  for (let i = 0; i < cursor.line; i++) start += ui.editor.getDoc().getLine(i).length + 1;
  start += cursor.ch;

  nextCompletion = { callback, cursor, token, start };
  if(activeCompletion == null) startAutocomplete();
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
    (<any>ui.editor).showHint({ completeSingle: false, customKeys: hintCustomKeys, hint });
    ui.completionTimeout = null;
  }, 100);
}

function onUndo() {
  if (ui.undoStack.length === 0) return;

  if (ui.undoQuantityByAction[ui.undoQuantityByAction.length - 1] === 0) ui.undoQuantityByAction.pop();
  let undoQuantityByAction = ui.undoQuantityByAction[ui.undoQuantityByAction.length - 1];

  for (let i = 0; i < undoQuantityByAction; i++) {
    let operationToUndo = ui.undoStack[ui.undoStack.length - 1];
    applyOperation(operationToUndo.clone(), "undo", true);

    ui.undoStack.pop()
    ui.redoStack.push(operationToUndo.invert());
  }

  if (ui.undoTimeout != null) {
    clearTimeout(ui.undoTimeout);
    ui.undoTimeout = null;
  }

  ui.redoQuantityByAction.push(ui.undoQuantityByAction[ui.undoQuantityByAction.length - 1]);
  ui.undoQuantityByAction[ui.undoQuantityByAction.length - 1] = 0;
}

function onRedo() {
  if (ui.redoStack.length === 0) return;

  let redoQuantityByAction = ui.redoQuantityByAction[ui.redoQuantityByAction.length - 1]
  for (let i = 0; i < redoQuantityByAction; i++) {
    let operationToRedo = ui.redoStack[ui.redoStack.length - 1];
    applyOperation(operationToRedo.clone(), "undo", true);

    ui.redoStack.pop()
    ui.undoStack.push(operationToRedo.invert());
  }

  if (ui.undoTimeout != null) {
    clearTimeout(ui.undoTimeout);
    ui.undoTimeout = null;

    ui.undoQuantityByAction.push(ui.redoQuantityByAction[ui.redoQuantityByAction.length - 1]);
  }
  else ui.undoQuantityByAction[ui.undoQuantityByAction.length - 1] = ui.redoQuantityByAction[ui.redoQuantityByAction.length - 1];

  ui.undoQuantityByAction.push(0);
  ui.redoQuantityByAction.pop();
}

// Load plugins
async.each(SupClient.pluginPaths.all, (pluginName, pluginCallback) => {
  if (pluginName === "sparklinlabs/typescript") { pluginCallback(); return; }

  let apiScript = document.createElement("script");
  apiScript.src = `/plugins/${pluginName}/api.js`;
  apiScript.addEventListener("load", () => { pluginCallback(); } );
  apiScript.addEventListener("error", () => { pluginCallback(); } );
  document.body.appendChild(apiScript);
}, (err) => {
  // Read API definitions
  let globalDefs = "";

  let actorComponentAccessors: string[] = [];
  for (let pluginName in SupAPI.contexts["typescript"].plugins) {
    let plugin = SupAPI.contexts["typescript"].plugins[pluginName];
    if (plugin.defs != null) globalDefs += plugin.defs;
    if (plugin.exposeActorComponent != null) actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
  }

  globalDefs = globalDefs.replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));
  fileNames.push("lib.d.ts");
  files["lib.d.ts"] = { id: "lib.d.ts", text: globalDefs, version: "" };

  // Start
  start();
});
