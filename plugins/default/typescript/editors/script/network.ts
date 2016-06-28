/// <reference path="../../typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import ui, { start as startUI, setupEditor, refreshErrors, showParameterPopup, clearParameterPopup } from "./ui";

import * as async from "async";
import ScriptAsset from "../../data/ScriptAsset";

export const data = {
  clientId: null as string,
  projectClient: <SupClient.ProjectClient>null,
  typescriptWorker: new Worker("typescriptWorker.js"),

  assetsById: <{[id: string]: ScriptAsset}>{},
  asset: <ScriptAsset>null,

  fileNames: <string[]>[],
  files: <{ [name: string]: { id: string; text: string; version: string; } }>{},
  fileNamesByScriptId: <{ [name: string]: string }>{}
};

export let socket: SocketIOClient.Socket;
SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "scriptEditor" }], () => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("welcome", onWelcome);
  socket.on("disconnect", SupClient.onDisconnected);
});

const onAssetCommands: { [command: string]: Function; } = {};
onAssetCommands["editText"] = (operationData: OperationData) => {
  ui.errorPaneStatus.classList.add("has-draft");
  ui.editor.receiveEditText(operationData);
};

onAssetCommands["applyDraftChanges"] = () => {
  ui.errorPaneStatus.classList.remove("has-draft");
};

let allScriptsReceived = false;
const scriptSubscriber: SupClient.AssetSubscriber = {
  onAssetReceived: (id: string, asset: ScriptAsset) => {
    data.assetsById[id] = asset;
    const fileName = `${data.projectClient.entries.getPathFromId(id)}.ts`;
    const file = { id: id, text: id === SupClient.query.asset ? asset.pub.draft : asset.pub.text, version: asset.pub.revisionId.toString() };
    data.files[fileName] = file;

    if (id === SupClient.query.asset) {
      setupEditor(data.clientId);
      SupClient.setEntryRevisionDisabled(false);

      data.asset = asset;
      startUI(data.asset);
    }

    if (!allScriptsReceived) {
      if (Object.keys(data.files).length === data.fileNames.length) {
        allScriptsReceived = true;
        data.typescriptWorker.postMessage({ type: "setup", fileNames: data.fileNames, files: data.files });
        scheduleErrorCheck();
      }
    } else {
      // All scripts have been received so this must be a newly created script
      data.typescriptWorker.postMessage({ type: "addFile", fileName, index: data.fileNames.indexOf(fileName), file });
      scheduleErrorCheck();
    }
  },

  onAssetRestored: (id: string, asset: ScriptAsset) => {
    data.assetsById[id] = asset;
    if (id === SupClient.query.asset) {
      data.asset = asset;
      if (ui.selectedRevision === "current") {
        startUI(data.asset);
        updateWorkerFile(id, asset.pub.draft, asset.pub.revisionId.toString());
      }
    } else {
      updateWorkerFile(id, asset.pub.text, asset.pub.revisionId.toString());
    }
  },

  onAssetEdited: (id: string, command: string, ...args: any[]) => {
    if (id !== SupClient.query.asset) {
      if (command === "applyDraftChanges") {
        const fileName = `${data.projectClient.entries.getPathFromId(id)}.ts`;
        const asset = data.assetsById[id];
        const file = data.files[fileName];
        file.text = asset.pub.text;
        file.version = asset.pub.revisionId.toString();

        data.typescriptWorker.postMessage({ type: "updateFile", fileName, text: file.text, version: file.version });
        scheduleErrorCheck();
      }
      return;
    }

    if (ui.selectedRevision === "current" && onAssetCommands[command] != null) onAssetCommands[command].apply(data.asset, args);
  },

  onAssetTrashed: (id: string) => {
    if (id !== SupClient.query.asset) return;

    ui.editor.clear();
    if (ui.errorCheckTimeout != null) clearTimeout(ui.errorCheckTimeout);
    if (ui.completionTimeout != null) clearTimeout(ui.completionTimeout);
    SupClient.onAssetTrashed();
  },
};

export function updateWorkerFile(id: string, text: string, version: string) {
  const fileName = `${data.projectClient.entries.getPathFromId(id)}.ts`;
  const file = data.files[fileName];
  file.text = text;
  file.version = version;

  data.typescriptWorker.postMessage({ type: "updateFile", fileName, text: file.text, version: file.version });
  scheduleErrorCheck();
}

const entriesSubscriber = {
  onEntriesReceived: (entries: SupCore.Data.Entries) => {
    entries.walk((entry) => {
      if (entry.type !== "script") return;

      const fileName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
      data.fileNames.push(fileName);
      data.fileNamesByScriptId[entry.id] = fileName;
      data.projectClient.subAsset(entry.id, "script", scriptSubscriber);
    });
  },

  onEntryAdded: (newEntry: any, parentId: string, index: number) => {
    if (newEntry.type !== "script") return;

    const fileName = `${data.projectClient.entries.getPathFromId(newEntry.id)}.ts`;

    let i = 0;
    data.projectClient.entries.walk((entry) => {
      if (entry.type !== "script") return;
      if (entry.id === newEntry.id) data.fileNames.splice(i, 0, fileName);
      i++;
    });
    data.fileNamesByScriptId[newEntry.id] = fileName;
    data.projectClient.subAsset(newEntry.id, "script", scriptSubscriber);
  },

  onEntryMoved: (id: string, parentId: string, index: number) => {
    const entry = data.projectClient.entries.byId[id];
    if (entry.type != null && entry.type !== "script") return;

    const renameFile = (entry: SupCore.Data.EntryNode) => {
      if (entry.type == null) {
        for (const child of entry.children) renameFile(child);
      } else if (entry.type === "script") {
        const oldFileName = data.fileNamesByScriptId[entry.id];
        const newFileName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;

        data.fileNames.splice(data.fileNames.indexOf(oldFileName), 1);
        let i = 0;
        data.projectClient.entries.walk((nextEntry) => {
          if (nextEntry.type !== "script") return;
          if (nextEntry.id === entry.id) data.fileNames.splice(i, 0, newFileName);
          i++;
        });

        data.fileNamesByScriptId[entry.id] = newFileName;
        const file = data.files[oldFileName];
        data.files[newFileName] = file;
        if (newFileName !== oldFileName) delete data.files[oldFileName];

        data.typescriptWorker.postMessage({ type: "removeFile", fileName: oldFileName });
        data.typescriptWorker.postMessage({ type: "addFile", fileName: newFileName, index: data.fileNames.indexOf(newFileName), file });
      }
    };
    renameFile(entry);
    scheduleErrorCheck();
  },

  onSetEntryProperty: (id: string, key: string, value: any) => {
    const entry = data.projectClient.entries.byId[id];
    if ((entry.type != null && entry.type !== "script") || key !== "name") return;

    const renameFile = (entry: SupCore.Data.EntryNode) => {
      if (entry.type == null) {
        for (const child of entry.children) renameFile(child);
      } else if (entry.type === "script") {
        const oldFileName = data.fileNamesByScriptId[entry.id];
        const newFileName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
        if (newFileName === oldFileName) return;

        const scriptIndex = data.fileNames.indexOf(oldFileName);
        data.fileNames[scriptIndex] = newFileName;
        data.fileNamesByScriptId[entry.id] = newFileName;
        const file = data.files[oldFileName];
        data.files[newFileName] = file;
        delete data.files[oldFileName];

        data.typescriptWorker.postMessage({ type: "removeFile", fileName: oldFileName });
        data.typescriptWorker.postMessage({ type: "addFile", fileName: newFileName, index: data.fileNames.indexOf(newFileName), file });
      }
    };
    renameFile(entry);
    scheduleErrorCheck();
  },

  onEntryTrashed: (id: string) => {
    const fileName = data.fileNamesByScriptId[id];
    if (fileName == null) return;

    data.fileNames.splice(data.fileNames.indexOf(fileName), 1);
    delete data.files[fileName];
    delete data.fileNamesByScriptId[id];

    data.typescriptWorker.postMessage({ type: "removeFile", fileName });
    scheduleErrorCheck();
  },
};

let isCheckingForErrors = false;
let hasScheduledErrorCheck = false;

interface CompletionRequest {
  callback: any;
  cursor: any;
  token: any;
  start: any;
}

let activeCompletion: CompletionRequest;
let nextCompletion: CompletionRequest;

data.typescriptWorker.onmessage = (event: MessageEvent) => {
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

      for (const item of event.data.list) {
        item.render = (parentElt: HTMLDivElement, data: any, item: { kind: string; name: string; info: string }) => {
          parentElt.style.maxWidth = "100em";

          const rowElement = document.createElement("div");
          rowElement.style.display = "flex";
          parentElt.appendChild(rowElement);

          const kindElement = document.createElement("div");
          kindElement.style.marginRight = "0.5em";
          kindElement.style.width = "6em";
          kindElement.textContent = item.kind;
          rowElement.appendChild(kindElement);

          const nameElement = document.createElement("div");
          nameElement.style.marginRight = "0.5em";
          nameElement.style.width = "15em";
          nameElement.style.fontWeight = "bold";
          nameElement.textContent = item.name;
          rowElement.appendChild(nameElement);

          const infoElement = document.createElement("div");
          infoElement.textContent = item.info;
          rowElement.appendChild(infoElement);
        };
      }
      const from = { line: activeCompletion.cursor.line, ch: activeCompletion.token.start };
      const to = { line: activeCompletion.cursor.line, ch: activeCompletion.token.end };
      activeCompletion.callback({ list: event.data.list, from, to });
      activeCompletion = null;
      break;

    case "quickInfo":
      if (ui.infoTimeout == null) {
        ui.infoElement.textContent = event.data.text;
        ui.editor.codeMirrorInstance.addWidget(ui.infoPosition, ui.infoElement, false);
      }
      break;

    case "parameterHint":
      clearParameterPopup();
      if (event.data.texts != null) showParameterPopup(event.data.texts, event.data.selectedItemIndex, event.data.selectedArgumentIndex);
      break;

    case "definition":
      if (window.parent != null) {
        const entry = SupClient.findEntryByPath(data.projectClient.entries.pub, event.data.fileName);
        SupClient.openEntry(entry.id, { line: event.data.line, ch: event.data.ch });
      }
      break;
  }
};

let isTabActive = true;
let errorCheckPending = false;
window.addEventListener("message", (event) => {
  if (event.data.type === "deactivate" || event.data.type === "activate") {
    isTabActive = event.data.type === "activate";

    if (isTabActive && errorCheckPending) startErrorCheck();
  }
});

function startErrorCheck() {
  if (isCheckingForErrors) return;

  isCheckingForErrors = true;
  hasScheduledErrorCheck = false;
  errorCheckPending = false;
  data.typescriptWorker.postMessage({ type: "checkForErrors" });
}

export function scheduleErrorCheck() {
  if (ui.errorCheckTimeout != null) clearTimeout(ui.errorCheckTimeout);
  if (!isTabActive) {
    errorCheckPending = true;
    return;
  }

  ui.errorCheckTimeout = window.setTimeout(() => {
    hasScheduledErrorCheck = true;
    if (!isCheckingForErrors) startErrorCheck();
  }, 300);
}

function startAutocomplete() {
  if (activeCompletion != null) return;

  activeCompletion = nextCompletion;
  nextCompletion = null;

  data.typescriptWorker.postMessage({
    type: "getCompletionAt",
    tokenString: activeCompletion.token.string,
    name: data.fileNamesByScriptId[SupClient.query.asset],
    start: activeCompletion.start
  });
}

export function setNextCompletion(completion: CompletionRequest) {
  nextCompletion = completion;
  if (activeCompletion == null) startAutocomplete();
}

function onWelcome(clientId: string) {
  data.clientId = clientId;
  loadPlugins();
}

function loadPlugins() {
  SupClient.fetch(`/systems/${SupCore.system.id}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    async.each(pluginsInfo.list, (pluginName, cb) => {
      SupClient.loadScript(`/systems/${SupCore.system.id}/plugins/${pluginName}/bundles/typescriptAPI.js`, cb);
    }, (err) => {
      // Read API definitions
      let globalDefs = "";

      const actorComponentAccessors: string[] = [];
      const plugins = SupCore.system.getPlugins<SupCore.TypeScriptAPIPlugin>("typescriptAPI");
      for (const pluginName in plugins) {
        const plugin = plugins[pluginName];
        if (plugin.defs != null) globalDefs += plugin.defs;
        if (plugin.exposeActorComponent != null) actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
      }

      globalDefs = globalDefs.replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));
      data.fileNames.push("lib.d.ts");
      data.files["lib.d.ts"] = { id: "lib.d.ts", text: globalDefs, version: "" };

      data.projectClient = new SupClient.ProjectClient(socket);
      data.projectClient.subEntries(entriesSubscriber);
    });
  });
}
