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
let info = { projectId: qs.project, assetId: qs.asset };
let data: { clientId: number; projectClient?: SupClient.ProjectClient; assetsById?: {[id: string]: ScriptAsset}; asset?: ScriptAsset; };
let ui: {
  editor?: CodeMirror.EditorFromTextArea;
  tmpCodeMirrorDoc?: CodeMirror.Doc;
  errorPane?: HTMLDivElement;
  errorPaneStatus?: HTMLDivElement;
  errorPaneInfo?: HTMLDivElement;
  errorsList?: HTMLDivElement;
  errorsTBody?: HTMLTableSectionElement;

  undoTimeout?: number;
  compileTimeout?: number;
  completionTimeout?: number;
  texts?: string[];

  undoStack?: OT.TextOperation[];
  undoQuantityByAction?: number[];
  redoStack?: OT.TextOperation[];
  redoQuantityByAction?: number[];

  sentOperation?: OT.TextOperation;
  pendingOperation?: OT.TextOperation;
} = {};
let socket: SocketIOClient.Socket;

let globalDefs = "";
let scriptNames: string[] = [];
let scriptNamesById: { [name: string]: string } = {};
let scripts: { [name: string]: { id: string, text: string } } = {};

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("welcome", onWelcome);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  window.addEventListener("message", (event) => {
    if (event.data.type === "activate") ui.editor.focus();
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
  (<any>ui.editor).on("keyup", (instance: any, event: any) => {
    // Ignore Ctrl, Cmd, Escape, Return, Tab, arrow keys
    if (event.ctrlKey || event.metaKey || [27, 9, 13, 37, 38, 39, 40, 16].indexOf(event.keyCode) !== -1) return;
    scheduleCompletion();
  });

  let nwDispatcher = (<any>window).nwDispatcher;
  if (nwDispatcher != null) {
    let gui = nwDispatcher.requireNwGui();

    let menu = new gui.Menu();
    menu.append(new gui.MenuItem({ label: "Cut (Ctrl-X)", click: () => { document.execCommand("cut"); } }));
    menu.append(new gui.MenuItem({ label: "Copy (Ctrl-C)", click: () => { document.execCommand("copy"); } }));
    menu.append(new gui.MenuItem({ label: "Paste (Ctrl-V)", click: () => { document.execCommand("paste"); } }));

    document.body.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      menu.popup(event.screenX - gui.Window.get().x, event.screenY - gui.Window.get().y);
      return false;
    });
  }

  // Error pane
  ui.errorPane = <HTMLDivElement>document.querySelector(".error-pane");
  ui.errorPaneStatus = <HTMLDivElement>ui.errorPane.querySelector(".status");
  ui.errorPaneInfo = <HTMLDivElement>ui.errorPaneStatus.querySelector(".info");
  ui.errorsList = <HTMLDivElement>ui.errorPane.querySelector(".errors");
  ui.errorsTBody = <HTMLTableSectionElement>ui.errorsList.querySelector("tbody");

  ui.errorsTBody.addEventListener("click", onErrorTBodyClick);

  let errorPaneResizeHandle = new PerfectResize(ui.errorPane, "bottom");
  errorPaneResizeHandle.on("drag", () => { ui.editor.refresh(); });

  let errorPaneToggleButton = ui.errorPane.querySelector("button.toggle")

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
      if (entry["type"] !== "script") return;

      var scriptName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
      scriptNames.push(scriptName);
      scriptNamesById[entry.id] = scriptName;
      data.projectClient.subAsset(entry.id, "script", scriptSubscriber);
    })
  },

  onEntryAdded: (newEntry: any, parentId: string, index: number) => {
    if (newEntry.type !== "script") return;

    let scriptName = `${data.projectClient.entries.getPathFromId(newEntry.id)}.ts`;

    let i = 0;
    data.projectClient.entries.walk((entry) => {
      if (entry.type !== "script") return;
      if (entry.id === newEntry.id) scriptNames.splice(i, 0, scriptName);
      i++;
    });
    scriptNamesById[newEntry.id] = scriptName;
    data.projectClient.subAsset(newEntry.id, "script", scriptSubscriber);
  },

  onEntryMoved: (id: string, parentId: string, index: number) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script") return;

    let oldScriptName = scriptNamesById[id];
    let newScriptName = `${data.projectClient.entries.getPathFromId(id)}.ts`;

    scriptNames.splice(scriptNames.indexOf(oldScriptName), 1);
    let i = 0;
    data.projectClient.entries.walk((entry) => {
      if (entry.type !== "script") return;
      if (entry.id === id) scriptNames.splice(i, 0, newScriptName);
      i++;
    });

    scriptNamesById[id] = newScriptName;
    scripts[newScriptName] = scripts[oldScriptName];
    if (newScriptName !== oldScriptName) delete scripts[oldScriptName];

    scheduleCompilation();
  },

  onSetEntryProperty: (id: string, key: string, value: any) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script") return;
    if (key !== "name") return;

    let oldScriptName = scriptNamesById[id];
    let newScriptName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
    if (newScriptName === oldScriptName) return;

    let scriptIndex = scriptNames.indexOf(oldScriptName);
    scriptNames[scriptIndex] = newScriptName;
    scriptNamesById[id] = newScriptName;
    scripts[newScriptName] = scripts[oldScriptName];
    delete scripts[oldScriptName];
  },

  onEntryTrashed: (id: string) => {
    let scriptName = scriptNamesById[id];
    if (scriptName == null) return;

    scriptNames.splice(scriptNames.indexOf(scriptName), 1);
    delete scripts[scriptName];
    delete scriptNamesById[id];

    scheduleCompilation();
  },
}

let allScriptsReceived = false;

var scriptSubscriber = {
  onAssetReceived: (err: string, asset: ScriptAsset) => {
    data.assetsById[asset.id] = asset;
    var scriptName = `${data.projectClient.entries.getPathFromId(asset.id)}.ts`;
    scripts[scriptName] =  { id: asset.id, text: asset.pub.text };

    if (asset.id === info.assetId) {
      data.asset = asset;

      ui.editor.getDoc().setValue(data.asset.pub.draft);
      ui.editor.getDoc().clearHistory();
      ui.editor.setOption("readOnly", false);
    }

    if(!allScriptsReceived && Object.keys(scripts).length === scriptNames.length) {
      allScriptsReceived = true;
      scheduleCompilation();
    }
  },

  onAssetEdited: (id: string, command: string, ...args: any[]) => {
    if (id !== info.assetId) {
      if (command === "saveText") {
        var scriptName = `${data.projectClient.entries.getPathFromId(id)}.ts`;
        scripts[scriptName] = { id, text: data.assetsById[id].pub.text };
        scheduleCompilation();
      }
      return
    }

    if (onAssetCommands[command] != null) onAssetCommands[command].apply(data.asset, args);
  },

  onAssetTrashed: (id: string) => {
    if (id !== info.assetId) return;

    if (ui.undoTimeout != null) clearTimeout(ui.undoTimeout);
    if (ui.compileTimeout != null) clearTimeout(ui.compileTimeout);
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

let compilationWorker = new Worker("compilationWorker.js")
let activeCompilation: { dummy: boolean; };
let nextCompilation: { dummy: boolean; };

compilationWorker.onmessage = (event) => {
  refreshErrors(event.data);

  activeCompilation = null;
  if(nextCompilation != null) startCompilationWorker();
};

function startCompilationWorker() {
  if(activeCompilation != null || nextCompilation == null) return;

  activeCompilation = nextCompilation;
  nextCompilation = null;

  compilationWorker.postMessage({ scriptNames, scripts, globalDefs });
}

function scheduleCompilation() {
  if (ui.compileTimeout != null) clearTimeout(ui.compileTimeout);

  ui.compileTimeout = window.setTimeout(() => {
    nextCompilation = { dummy: true };
    if (activeCompilation == null) startCompilationWorker();
  }, 500);
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
  let lastSelfErrowRow: HTMLTableRowElement = null;

  // Display new ones
  for (let error of errors) {
    let errorRow = document.createElement("tr");
    (<any>errorRow.dataset).assetId = scripts[error.file].id;
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

    if (error.file !== scriptNamesById[info.assetId]) {
      ui.errorsTBody.appendChild(errorRow);
      continue;
    }

    errorRow.classList.add("self");
    ui.errorsTBody.insertBefore(errorRow, (lastSelfErrowRow != null) ? lastSelfErrowRow.nextElementSibling : ui.errorsTBody.firstChild);
    lastSelfErrowRow = errorRow;
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
    // TODO: Post message to parent and switch to correct tab
  }
}

function onEditText(instance: CodeMirror.Editor, changes: CodeMirror.EditorChange[]) {
  scripts[scriptNamesById[info.assetId]].text = ui.editor.getDoc().getValue();

  // We ignore the initial setValue
  if ((<any>changes[0]).origin !== "setValue") scheduleCompilation();

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

let completionWorker = new Worker("completionWorker.js")
let activeCompletion: { callback: any; cursor: any; token: any, start: any };
let nextCompletion: { callback: any; cursor: any; token: any, start: any };

completionWorker.onmessage = (event) => {
  activeCompletion.callback({
    list: event.data,
    from: (<any>CodeMirror).Pos(activeCompletion.cursor.line, activeCompletion.token.start),
    to: (<any>CodeMirror).Pos(activeCompletion.cursor.line, activeCompletion.token.end)
  });

  activeCompletion = null;
  if(nextCompletion != null) startCompletionWorker();
};

function startCompletionWorker() {
  if(activeCompletion != null || nextCompletion == null) return;

  activeCompletion = nextCompletion;
  nextCompletion = null;

  completionWorker.postMessage({
    scriptNames, scripts, globalDefs,
    tokenString: activeCompletion.token.string,
    start: activeCompletion.start,
    name: scriptNamesById[info.assetId]
  });
}

function hint(instance: any, callback: any) {
  let cursor = ui.editor.getDoc().getCursor();
  let token = ui.editor.getTokenAt(cursor);
  if (token.string === ".") token.start = token.end;

  let start = 0;
  for (let i = 0; i < cursor.line; i++) start += ui.editor.getDoc().getLine(i).length + 1;
  start += cursor.ch;

  nextCompletion = { callback, cursor, token, start };
  if(activeCompletion == null) startCompletionWorker();
}
(<any>hint).async = true;

function scheduleCompletion() {
  if (ui.completionTimeout != null) clearTimeout(ui.completionTimeout);

  ui.completionTimeout = window.setTimeout(() => {
    (<any>ui.editor).showHint({
      completeSingle: false,
      customKeys: {
        "Up": (cm: any, commands: any) => { commands.moveFocus(-1); },
        "Down": (cm: any, commands: any) => { commands.moveFocus(1); },
        "Enter": (cm: any, commands: any) => { commands.pick(); },
        "Tab": (cm: any, commands: any) => { commands.pick(); },
        "Esc": (cm: any, commands: any) => { commands.close(); },
      },
      hint
    });
    ui.completionTimeout = null;
  }, 500);
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

  let apiScript = document.createElement('script');
  apiScript.src = `/plugins/${pluginName}/api.js`;
  apiScript.addEventListener('load', () => { pluginCallback(); } );
  apiScript.addEventListener('error', () => { pluginCallback(); } );
  document.body.appendChild(apiScript);
}, (err) => {
  // Read API definitions
  let actorComponentAccessors: string[] = [];
  for (let pluginName in SupAPI.contexts["typescript"].plugins) {
    let plugin = SupAPI.contexts["typescript"].plugins[pluginName];
    if (plugin.defs != null) globalDefs += plugin.defs;
    if (plugin.exposeActorComponent != null) actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
  }
  globalDefs = globalDefs.replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));

  // Start
  start();
});
