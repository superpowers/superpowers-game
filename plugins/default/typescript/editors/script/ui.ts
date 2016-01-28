import { socket, data, scheduleErrorCheck, setNextCompletion } from "./network";

let ui: {
  editor: TextEditorWidget;
  previousLine: number;

  errorPane: HTMLDivElement;
  errorPaneStatus: HTMLDivElement;
  errorPaneInfo: HTMLDivElement;
  errorsTBody: HTMLTableSectionElement;
  saveButton: HTMLButtonElement;
  saveWithErrorsButton: HTMLButtonElement;

  errorCheckTimeout: number;
  completionTimeout: number;
  completionOpened: boolean;

  infoElement: HTMLDivElement;
  infoPosition: { line: number; ch: number; };
  infoTimeout: number;

  parameterElement: HTMLDivElement;
  parameterTimeout: number;
  signatureTexts: { prefix: string; parameters: string[]; suffix: string; }[];
  selectedSignatureIndex: number;
  selectedArgumentIndex: number;
} = {} as any;
export default ui;

let defaultPosition: CodeMirror.Position;
window.addEventListener("message", (event) => {
  if (event.data.type === "activate") ui.editor.codeMirrorInstance.focus();
  if (event.data.type === "setState") {
    let line = parseInt(event.data.state.line, 10);
    let ch = parseInt(event.data.state.ch, 10);
    if (ui.editor != null) ui.editor.codeMirrorInstance.getDoc().setCursor({ line , ch });
    else defaultPosition = { line, ch };
  }
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
export function setupEditor(clientId: number, script: string) {
  SupClient.setupHotkeys();

  let textArea = <HTMLTextAreaElement>document.querySelector(".text-editor");
  ui.editor = new TextEditorWidget(data.projectClient, clientId, textArea, {
    mode: "text/typescript",
    extraKeys: {
      "Ctrl-S": () => { applyDraftChanges({ ignoreErrors: false }); },
      "Cmd-S": () => { applyDraftChanges({ ignoreErrors: false }); },
      "Ctrl-Alt-S": () => { applyDraftChanges({ ignoreErrors: true }); },
      "Cmd-Alt-S": () => { applyDraftChanges({ ignoreErrors: true }); },
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
    sendOperationCallback: (operation: OperationData) => { data.projectClient.editAsset(SupClient.query.asset, "editText", operation, data.asset.document.getRevisionId()); }
  });
  ui.previousLine = -1;

  SupClient.setupCollapsablePane(ui.errorPane, () => { ui.editor.codeMirrorInstance.refresh(); });

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

  ui.editor.setText(script);
  if (defaultPosition != null) ui.editor.codeMirrorInstance.getDoc().setCursor(defaultPosition);
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



// Error pane
ui.errorPane = <HTMLDivElement>document.querySelector(".error-pane");
ui.errorPaneStatus = <HTMLDivElement>ui.errorPane.querySelector(".header");
ui.errorPaneInfo = <HTMLDivElement>ui.errorPaneStatus.querySelector(".info");

let errorsContent = ui.errorPane.querySelector(".content") as HTMLDivElement;
ui.errorsTBody = <HTMLTableSectionElement>errorsContent.querySelector("tbody");
ui.errorsTBody.addEventListener("click", onErrorTBodyClick);

interface CompilationError {
  file: string;
  position: { line: number; character: number; };
  length: number;
  message: string;
}

export function refreshErrors(errors: CompilationError[]) {
  // Remove all previous errors
  for (let textMarker of ui.editor.codeMirrorInstance.getDoc().getAllMarks()) {
    if ((<any>textMarker).className !== "line-error") continue;
    textMarker.clear();
  }

  ui.editor.codeMirrorInstance.clearGutter("line-error-gutter");

  ui.errorsTBody.innerHTML = "";

  ui.saveButton.hidden = false;
  ui.saveWithErrorsButton.hidden = true;

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
  let otherErrorsValue = SupClient.i18n.t(`scriptEditor:errors.${otherErrorsCount > 1 ? "severalErrors" : "oneError"}`, { errors: otherErrorsCount.toString() });
  let otherErrors = SupClient.i18n.t("scriptEditor:errors.otherErrorsInfo", { errors: otherErrorsValue.toString() });

  if (selfErrorsCount > 0) {
    ui.saveButton.hidden = true;
    ui.saveWithErrorsButton.hidden = false;

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
    if (window.parent != null) window.parent.postMessage({ type: "openEntry", id: assetId, state: { line, ch: character } }, window.location.origin);
  }
}

// Save buttons
ui.saveButton = ui.errorPane.querySelector(".draft button.save") as HTMLButtonElement;
ui.saveButton.addEventListener("click", (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  applyDraftChanges({ ignoreErrors: false });
});

ui.saveWithErrorsButton = ui.errorPane.querySelector(".draft button.save-with-errors") as HTMLButtonElement;
ui.saveWithErrorsButton.addEventListener("click", (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  applyDraftChanges({ ignoreErrors: true });
});

function applyDraftChanges(options: { ignoreErrors: boolean }) {
  ui.saveButton.disabled = true;
  ui.saveWithErrorsButton.disabled = true;

  ui.saveButton.textContent = SupClient.i18n.t("common:states.saving");
  if (options.ignoreErrors) ui.saveWithErrorsButton.textContent = SupClient.i18n.t("common:states.saving");

  data.projectClient.editAssetNoErrorHandling(SupClient.query.asset, "applyDraftChanges", options, (err: string) => {
    if (err != null && err !== "foundSelfErrors") {
      /* tslint:disable:no-unused-expression */
      new SupClient.Dialogs.InfoDialog(err);
      /* tslint:enable:no-unused-expression */
      SupClient.onDisconnected();
      return;
    }

    ui.saveButton.disabled = false;
    ui.saveWithErrorsButton.disabled = false;
    ui.saveButton.textContent = SupClient.i18n.t("common:actions.applyChanges");
    ui.saveWithErrorsButton.textContent = SupClient.i18n.t("common:actions.applyChangesWithErrors");
  });
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
  new SupClient.Dialogs.PromptDialog(SupClient.i18n.t("scriptEditor:globalSearch.prompt"), options, (text) => {
    /* tslint:enable:no-unused-expression */
    if (text == null) {
      ui.editor.codeMirrorInstance.focus();
      return;
    }
    window.parent.postMessage({ type: "openTool", name: "search", state: { text } }, window.location.origin);
  });
}
