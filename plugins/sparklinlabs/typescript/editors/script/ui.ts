import { socket, data, scheduleErrorCheck, setNextCompletion } from "./network";

/* tslint:disable */
let PerfectResize = require("perfect-resize");
/* tslint:enable */

let ui: {
  editor?: TextEditorWidget;
  previousLine?: number;

  errorPane?: HTMLDivElement;
  errorPaneStatus?: HTMLDivElement;
  errorPaneInfo?: HTMLDivElement;
  errorsTBody?: HTMLTableSectionElement;

  errorCheckTimeout?: number;
  completionTimeout?: number;
  completionOpened?: boolean;

  infoElement?: HTMLDivElement;
  infoPosition?: { line: number; ch: number; };
  infoTimeout?: number;

  parameterElement?: HTMLDivElement;
  parameterTimeout?: number;
  signatureTexts?: { prefix: string; parameters: string[]; suffix: string; }[];
  selectedSignatureIndex?: number;
  selectedArgumentIndex?: number;
} = {};
export default ui;

window.addEventListener("message", (event) => {
  if (event.data.type === "activate") ui.editor.codeMirrorInstance.focus();

  if (event.data.line != null && event.data.ch != null)
    ui.editor.codeMirrorInstance.getDoc().setCursor({ line: parseInt(event.data.line, 10), ch: parseInt(event.data.ch, 10) });
});

// Parameter hint popup
ui.parameterElement = <HTMLDivElement>document.querySelector(".popup-parameter");
ui.parameterElement.parentElement.removeChild(ui.parameterElement);
ui.parameterElement.style.display = "";

let parameterPopupKeyMap = {
  "Esc": () => { clearParameterPopup(); },
  "Up": () => { updateParameterHint(ui.selectedSignatureIndex - 1); },
  "Down": () => { updateParameterHint(ui.selectedSignatureIndex + 1); },
  "Enter": () => {
    let selectedSignature = ui.signatureTexts[ui.selectedSignatureIndex];
    if (selectedSignature.parameters.length === 0) return;

    let cursorPosition = ui.editor.codeMirrorInstance.getDoc().getCursor();
    let text = "";

    for (let parameterIndex = 0; parameterIndex < selectedSignature.parameters.length; parameterIndex++) {
      if (parameterIndex !== 0) text += ", ";
      text += selectedSignature.parameters[parameterIndex];
    }
    ui.editor.codeMirrorInstance.getDoc().replaceRange(text, cursorPosition, null);
    let endSelection = { line: cursorPosition.line, ch: cursorPosition.ch + selectedSignature.parameters[0].length };
    ui.editor.codeMirrorInstance.getDoc().setSelection(cursorPosition, endSelection);
  },
  "Tab": () => {
    let selectedSignature = ui.signatureTexts[ui.selectedSignatureIndex];
    if (selectedSignature.parameters.length === 0) return;
    if (ui.selectedArgumentIndex === selectedSignature.parameters.length - 1) return;

    let cursorPosition = ui.editor.codeMirrorInstance.getDoc().getCursor();

    cursorPosition.ch += 2;
    let endSelection = { line: cursorPosition.line, ch: cursorPosition.ch + selectedSignature.parameters[ui.selectedArgumentIndex + 1].length };
    ui.editor.codeMirrorInstance.getDoc().setSelection(cursorPosition, endSelection);
  }
};

// Setup editor
export function setupEditor(clientId: number) {
  SupClient.setupHotkeys();

  let textArea = <HTMLTextAreaElement>document.querySelector(".text-editor");
  ui.editor = new TextEditorWidget(data.projectClient, clientId, textArea, {
    mode: "text/typescript",
    extraKeys: {
      "Ctrl-Space": () => {
        scheduleParameterHint();
        scheduleCompletion();
      },
      "Cmd-Space": () => {
        scheduleParameterHint();
        scheduleCompletion();
      },
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
          name: data.fileNamesByScriptId[SupClient.query.asset],
          start
        });
      }
    },
    editCallback: onEditText,
    sendOperationCallback: onSendOperation,
    saveCallback: onSaveText
  });
  ui.previousLine = -1;

  (<any>ui.editor.codeMirrorInstance).on("keyup", (instance: any, event: any) => {
    clearInfoPopup();

    // "("" character triggers the parameter hint
    if (event.keyCode === 53 ||
       (ui.parameterElement.parentElement != null && event.keyCode !== 27 && event.keyCode !== 38 && event.keyCode !== 40))
          scheduleParameterHint();

    // Ignore Ctrl, Cmd, Escape, Return, Tab, arrow keys, F8
    if (event.ctrlKey || event.metaKey || [27, 9, 13, 37, 38, 39, 40, 119, 16].indexOf(event.keyCode) !== -1) return;

    // If the completion popup is active, the hint() method will automatically
    // call for more autocomplete, so we don't need to do anything here.
    if ((<any>ui.editor.codeMirrorInstance).state.completionActive != null && (<any>ui.editor.codeMirrorInstance).state.completionActive.active()) return;
    scheduleCompletion();
  });

  (<any>ui.editor.codeMirrorInstance).on("cursorActivity", () => {
    let currentLine = ui.editor.codeMirrorInstance.getDoc().getCursor().line;
    if (Math.abs(currentLine - ui.previousLine) >= 1) clearParameterPopup();
    else if (ui.parameterElement.parentElement != null) scheduleParameterHint();
    ui.previousLine = currentLine;
  });

  (<any>ui.editor.codeMirrorInstance).on("endCompletion", () => {
    ui.completionOpened = false;
    if (ui.parameterElement.parentElement != null) ui.editor.codeMirrorInstance.addKeyMap(parameterPopupKeyMap);
  });

  // Context menu
if (window.navigator.userAgent.indexOf("Electron") !== -1) {
    let electron: GitHubElectron.Electron = (top as any).global.require("electron");
    let win = electron.remote.getCurrentWindow();

    let menu = new electron.remote.Menu();
    menu.append(new electron.remote.MenuItem({ label: SupClient.i18n.t("scriptEditor:contextMenu.cut"), click: () => { document.execCommand("cut"); } }));
    menu.append(new electron.remote.MenuItem({ label: SupClient.i18n.t("scriptEditor:contextMenu.copy"), click: () => { document.execCommand("copy"); } }));
    menu.append(new electron.remote.MenuItem({ label: SupClient.i18n.t("scriptEditor:contextMenu.paste"), click: () => { document.execCommand("paste"); } }));

    document.querySelector(".text-editor-container").addEventListener("contextmenu", (event: any) => {
      event.preventDefault();
      let bounds = win.getBounds();
      menu.popup(win, event.screenX - bounds.x, event.screenY - bounds.y);
      return false;
    });
  }
}

let localVersionNumber = 0;
function onEditText(text: string, origin: string) {
  let localFileName = data.fileNamesByScriptId[SupClient.query.asset];
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
  socket.emit("edit:assets", SupClient.query.asset, "editText", operation, data.asset.document.getRevisionId(), (err: string) => {
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

export function refreshErrors(errors: Array<{file: string; position: { line: number; character: number; }; length: number; message: string}>) {
  // Remove all previous erros
  for (let textMarker of ui.editor.codeMirrorInstance.getDoc().getAllMarks()) {
    if ((<any>textMarker).className !== "line-error") continue;
    textMarker.clear();
  }

  ui.editor.codeMirrorInstance.clearGutter("line-error-gutter");

  ui.errorsTBody.innerHTML = "";

  if (errors.length === 0) {
    ui.errorPaneInfo.textContent = SupClient.i18n.t("scriptEditor:errors.noErrors");
    ui.errorPaneStatus.classList.remove("has-errors");
    return;
  }

  ui.errorPaneStatus.classList.add("has-errors");

  let selfErrorsCount = 0;
  let lastSelfErrorRow: HTMLTableRowElement = null;

  // Display new ones
  for (let error of errors) {
    let errorRow = document.createElement("tr");

    errorRow.dataset["line"] = error.position.line.toString();
    errorRow.dataset["character"] = error.position.character.toString();

    let positionCell = document.createElement("td");
    positionCell.textContent = (error.position.line + 1).toString();
    errorRow.appendChild(positionCell);

    let messageCell = document.createElement("td");
    messageCell.textContent = error.message;
    errorRow.appendChild(messageCell);

    let scriptCell = document.createElement("td");
    errorRow.appendChild(scriptCell);
    if (error.file !== "") {
      errorRow.dataset["assetId"] = data.files[error.file].id;
      scriptCell.textContent = error.file.substring(0, error.file.length - 3);
    } else scriptCell.textContent = "Internal";

    if (error.file !== data.fileNamesByScriptId[SupClient.query.asset]) {
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

  let selfErrorsValue = SupClient.i18n.t(`scriptEditor:errors.${selfErrorsCount > 1 ? "severalErrors" : "oneError"}`, { errors: selfErrorsCount.toString() });
  let selfErrors = SupClient.i18n.t("scriptEditor:errors.selfErrorsInfo", { errors: selfErrorsValue.toString() });
  let otherErrorsValue = SupClient.i18n.t(`scriptEditor:errors.${otherErrorsCount > 1 ? "severalErrors" : "oneError"}`, { errors: selfErrorsCount.toString() });
  let otherErrors = SupClient.i18n.t("scriptEditor:errors.otherErrorsInfo", { errors: otherErrorsValue.toString() });

  if (selfErrorsCount > 0) {
    if (otherErrorsCount === 0) ui.errorPaneInfo.textContent = selfErrors;
    else ui.errorPaneInfo.textContent = SupClient.i18n.t("scriptEditor:errors.bothErrorsInfo", { selfErrors, otherErrors });
  } else ui.errorPaneInfo.textContent = otherErrors;
}

function onErrorTBodyClick(event: MouseEvent) {
  let target = <HTMLElement>event.target;
  while (true) {
    if (target.tagName === "TBODY") return;
    if (target.tagName === "TR") break;
    target = target.parentElement;
  }

  let assetId = target.dataset["assetId"];
  if (assetId == null) return;

  let line = target.dataset["line"];
  let character = target.dataset["character"];

  if (assetId === SupClient.query.asset) {
    ui.editor.codeMirrorInstance.getDoc().setCursor({ line: parseInt(line, 10), ch: parseInt(character, 10) });
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
  socket.emit("edit:assets", SupClient.query.asset, "saveText", (err: string) => { if (err != null) { alert(err); SupClient.onDisconnected(); }});
}

// Info popup
ui.infoElement = document.createElement("div");
ui.infoElement.classList.add("popup-info");

document.addEventListener("mouseout", (event) => { clearInfoPopup(); });

let previousMousePosition = { x: -1, y: -1 };
document.addEventListener("mousemove", (event) => {
  if (ui.editor == null) return;

  // On some systems, Chrome (at least v43) generates
  // spurious "mousemove" events every second or so.
  if (event.clientX === previousMousePosition.x && event.clientY === previousMousePosition.y) return;
  previousMousePosition.x = event.clientX;
  previousMousePosition.y = event.clientY;
  clearInfoPopup();

  ui.infoTimeout = window.setTimeout(() => {
    ui.infoPosition = ui.editor.codeMirrorInstance.coordsChar({ left: event.clientX, top: event.clientY });
    if ((<any>ui.infoPosition).outside) return;

    let start = 0;
    for (let i = 0; i < ui.infoPosition.line; i++) start += ui.editor.codeMirrorInstance.getDoc().getLine(i).length + 1;
    start += ui.infoPosition.ch;

    ui.infoTimeout = null;
    data.typescriptWorker.postMessage({
      type: "getQuickInfoAt",
      name: data.fileNamesByScriptId[SupClient.query.asset],
      start
    });
  }, 200);
});

function clearInfoPopup() {
  if (ui.infoElement.parentElement != null) ui.infoElement.parentElement.removeChild(ui.infoElement);
  if (ui.infoTimeout != null) clearTimeout(ui.infoTimeout);
}



export function showParameterPopup(texts: { prefix: string; parameters: string[]; suffix: string; }[], selectedItemIndex: number, selectedArgumentIndex: number) {
  ui.signatureTexts = texts;
  ui.selectedArgumentIndex = selectedArgumentIndex;
  updateParameterHint(selectedItemIndex);

  let position = ui.editor.codeMirrorInstance.getDoc().getCursor();
  let coordinates  = ui.editor.codeMirrorInstance.cursorCoords(position, "page");

  ui.parameterElement.style.top = `${Math.round(coordinates.top - 30)}px`;
  ui.parameterElement.style.left = `${coordinates.left}px`;
  document.body.appendChild(ui.parameterElement);
  if (!ui.completionOpened) ui.editor.codeMirrorInstance.addKeyMap(parameterPopupKeyMap);
}

function updateParameterHint(index: number) {
  if (index < 0) index = ui.signatureTexts.length - 1;
  else if (index >= ui.signatureTexts.length) index = 0;

  ui.selectedSignatureIndex = index;
  ui.parameterElement.querySelector(".item").textContent = `(${index + 1}/${ui.signatureTexts.length})`;

  let text = ui.signatureTexts[index];
  let prefix = text.prefix;
  let parameter = "";
  let suffix = "";

  for (let parameterIndex = 0; parameterIndex < text.parameters.length; parameterIndex++) {
    let parameterItem = text.parameters[parameterIndex];

    if (parameterIndex < ui.selectedArgumentIndex) {
      if (parameterIndex !== 0) prefix += ", ";
      prefix += parameterItem;

    } else if (parameterIndex === ui.selectedArgumentIndex) {
      if (parameterIndex !== 0) prefix += ", ";
      parameter = parameterItem;

    } else {
      if (parameterIndex !== 0) suffix += ", ";
      suffix += parameterItem;
    }

  }
  ui.parameterElement.querySelector(".prefix").textContent = prefix;
  ui.parameterElement.querySelector(".parameter").textContent = parameter;
  suffix += text.suffix;
  ui.parameterElement.querySelector(".suffix").textContent = suffix;
}

export function clearParameterPopup() {
  if (ui.parameterElement.parentElement != null) ui.parameterElement.parentElement.removeChild(ui.parameterElement);
  ui.editor.codeMirrorInstance.removeKeyMap(parameterPopupKeyMap);
}

function scheduleParameterHint() {
  if (ui.parameterTimeout != null) clearTimeout(ui.parameterTimeout);

  ui.parameterTimeout = window.setTimeout(() => {
    let cursor = ui.editor.codeMirrorInstance.getDoc().getCursor();
    let token = ui.editor.codeMirrorInstance.getTokenAt(cursor);
    if (token.string === ".") token.start = token.end;

    let start = 0;
    for (let i = 0; i < cursor.line; i++) start += ui.editor.codeMirrorInstance.getDoc().getLine(i).length + 1;
    start += cursor.ch;

    data.typescriptWorker.postMessage({
      type: "getParameterHintAt",
      name: data.fileNamesByScriptId[SupClient.query.asset],
      start
    });

    ui.parameterTimeout = null;
  }, 100);
}

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
    ui.completionOpened = true;
    if (ui.parameterElement.parentElement != null) ui.editor.codeMirrorInstance.removeKeyMap(parameterPopupKeyMap);

    (<any>ui.editor.codeMirrorInstance).showHint({ completeSingle: false, customKeys: hintCustomKeys, hint });
    ui.completionTimeout = null;
  }, 100);
}

// Global search
function onGlobalSearch() {
  if (window.parent == null) {
    // TODO: Find a way to make it work? or display a message saying that you can't?
    return;
  }

  let options = {
    placeholder: SupClient.i18n.t("scriptEditor:globalSearch.placeholder"),
    initialValue: ui.editor.codeMirrorInstance.getDoc().getSelection(),
    validationLabel: SupClient.i18n.t("common:actions.search")
  };

  /* tslint:disable:no-unused-expression */
  new SupClient.dialogs.PromptDialog(SupClient.i18n.t("scriptEditor:globalSearch.prompt"), options, (text) => {
    /* tslint:enable:no-unused-expression */
    if (text == null) {
      ui.editor.codeMirrorInstance.focus();
      return;
    }
    window.parent.postMessage({ type: "openTool", name: "search", options: { text } }, (<any>window.location).origin);
  });
}
