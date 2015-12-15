import ui, { setupEditor, refreshErrors, showParameterPopup, clearParameterPopup } from "./ui";

import * as async from "async";
import ScriptAsset from "../../data/ScriptAsset";

export let data = {
  clientId: <number>null,
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

let onAssetCommands: any = {};
onAssetCommands.editText = (operationData: OperationData) => {
  ui.errorPaneStatus.classList.add("has-draft");
  ui.editor.receiveEditText(operationData);
};

onAssetCommands.applyDraftChanges = () => {
  ui.errorPaneStatus.classList.remove("has-draft");
};

let allScriptsReceived = false;
let scriptSubscriber: SupClient.AssetSubscriber = {
  onAssetReceived: (id: string, asset: ScriptAsset) => {
    data.assetsById[asset.id] = asset;
    let fileName = `${data.projectClient.entries.getPathFromId(asset.id)}.ts`;
    let file = { id: asset.id, text: asset.pub.text, version: asset.pub.revisionId.toString() };
    data.files[fileName] = file;

    if (asset.id === SupClient.query.asset) {
      data.asset = asset;

      (<any>ui.errorPaneStatus.classList.toggle)("has-draft", data.asset.hasDraft);
      ui.editor.setText(data.asset.pub.draft);
      if (SupClient.query["line"] != null && SupClient.query["ch"] != null)
        ui.editor.codeMirrorInstance.getDoc().setCursor({ line: parseInt(SupClient.query["line"], 10), ch: parseInt(SupClient.query["ch"], 10) });
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

  onAssetEdited: (id: string, command: string, ...args: any[]) => {
    if (id !== SupClient.query.asset) {
      if (command === "applyDraftChanges") {
        let fileName = `${data.projectClient.entries.getPathFromId(id)}.ts`;
        let asset = data.assetsById[id];
        let file = data.files[fileName];
        file.text = asset.pub.text;
        file.version = asset.pub.revisionId.toString();

        data.typescriptWorker.postMessage({ type: "updateFile", fileName, text: file.text, version: file.version });
        scheduleErrorCheck();
      }
      return;
    }

    if (onAssetCommands[command] != null) onAssetCommands[command].apply(data.asset, args);
  },

  onAssetTrashed: (id: string) => {
    if (id !== SupClient.query.asset) return;

    ui.editor.clear();
    if (ui.errorCheckTimeout != null) clearTimeout(ui.errorCheckTimeout);
    if (ui.completionTimeout != null) clearTimeout(ui.completionTimeout);
    SupClient.onAssetTrashed();
  },
};

let entriesSubscriber = {
  onEntriesReceived: (entries: SupCore.Data.Entries) => {
    entries.walk((entry) => {
      if (entry.type !== "script") return;

      let fileName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
      data.fileNames.push(fileName);
      data.fileNamesByScriptId[entry.id] = fileName;
      data.projectClient.subAsset(entry.id, "script", scriptSubscriber);
    });
  },

  onEntryAdded: (newEntry: any, parentId: string, index: number) => {
    if (newEntry.type !== "script") return;

    let fileName = `${data.projectClient.entries.getPathFromId(newEntry.id)}.ts`;

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
    let entry = data.projectClient.entries.byId[id];
    if (entry.type != null && entry.type !== "script") return;

    let renameFile = (entry: SupCore.Data.EntryNode) => {
      if (entry.type == null) {
        for (let child of entry.children) renameFile(child);
      } else if (entry.type === "script") {
        let oldFileName = data.fileNamesByScriptId[entry.id];
        let newFileName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;

        data.fileNames.splice(data.fileNames.indexOf(oldFileName), 1);
        let i = 0;
        data.projectClient.entries.walk((nextEntry) => {
          if (nextEntry.type !== "script") return;
          if (nextEntry.id === entry.id) data.fileNames.splice(i, 0, newFileName);
          i++;
        });

        data.fileNamesByScriptId[entry.id] = newFileName;
        let file = data.files[oldFileName];
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
    let entry = data.projectClient.entries.byId[id];
    if ((entry.type != null && entry.type !== "script") || key !== "name") return;

    let renameFile = (entry: SupCore.Data.EntryNode) => {
      if (entry.type == null) {
        for (let child of entry.children) renameFile(child);
      } else if (entry.type === "script") {
        let oldFileName = data.fileNamesByScriptId[entry.id];
        let newFileName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
        if (newFileName === oldFileName) return;

        let scriptIndex = data.fileNames.indexOf(oldFileName);
        data.fileNames[scriptIndex] = newFileName;
        data.fileNamesByScriptId[entry.id] = newFileName;
        let file = data.files[oldFileName];
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
    let fileName = data.fileNamesByScriptId[id];
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
      let from = { line: activeCompletion.cursor.line, ch: activeCompletion.token.start };
      let to = { line: activeCompletion.cursor.line, ch: activeCompletion.token.end };
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
        let entry = SupClient.findEntryByPath(data.projectClient.entries.pub, event.data.fileName);
        window.parent.postMessage({ type: "openEntry", id: entry.id, options: { line: event.data.line, ch: event.data.ch } }, (<any>window.location).origin);
      }
      break;
  }
};

function startErrorCheck() {
  if (isCheckingForErrors) return;

  isCheckingForErrors = true;
  hasScheduledErrorCheck = false;
  data.typescriptWorker.postMessage({ type: "checkForErrors" });
}

export function scheduleErrorCheck() {
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

  data.typescriptWorker.postMessage({
    type: "getCompletionAt",
    tokenString: activeCompletion.token.string,
    name: data.fileNamesByScriptId[SupClient.query.asset],
    start: activeCompletion.start
  });
}

export function setNextCompletion(completion: CompletionRequest) {
  nextCompletion = completion;
  if(activeCompletion == null) startAutocomplete();
}

function onWelcome(clientId: number) {
  data.clientId = clientId;
  loadPlugins();
}

function loadPlugins() {
  SupClient.fetch(`/systems/${SupCore.system.name}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    async.each(pluginsInfo.list, (pluginName, pluginCallback) => {
      if (pluginName === "sparklinlabs/typescript") { pluginCallback(); return; }

      let apiScript = document.createElement("script");
      apiScript.src = `/systems/${SupCore.system.name}/plugins/${pluginName}/api.js`;
      apiScript.addEventListener("load", () => { pluginCallback(); } );
      apiScript.addEventListener("error", () => { pluginCallback(); } );
      document.body.appendChild(apiScript);
    }, (err) => {
      // Read API definitions
      let globalDefs = "";

      let actorComponentAccessors: string[] = [];
      for (let pluginName in SupCore.system.api.contexts["typescript"].plugins) {
        let plugin = SupCore.system.api.contexts["typescript"].plugins[pluginName];
        if (plugin.defs != null) globalDefs += plugin.defs;
        if (plugin.exposeActorComponent != null) actorComponentAccessors.push(`${plugin.exposeActorComponent.propertyName}: ${plugin.exposeActorComponent.className};`);
      }

      globalDefs = globalDefs.replace("// INSERT_COMPONENT_ACCESSORS", actorComponentAccessors.join("\n    "));
      data.fileNames.push("lib.d.ts");
      data.files["lib.d.ts"] = { id: "lib.d.ts", text: globalDefs, version: "" };

      data.projectClient = new SupClient.ProjectClient(socket);
      data.projectClient.subEntries(entriesSubscriber);

      setupEditor(data.clientId);
    });
  });
}
