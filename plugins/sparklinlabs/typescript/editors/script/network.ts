import info from "./info";
import ui, { setupEditor, refreshErrors } from "./ui";

import * as async from "async";
import ScriptAsset from "../../data/ScriptAsset";

export let data: {
  projectClient?: SupClient.ProjectClient;
  
  typescriptWorker: Worker;

  assetsById?: {[id: string]: ScriptAsset};
  asset?: ScriptAsset;
  
  fileNames?: string[];
  files?: { [name: string]: { id: string; text: string; version: string; } };
  fileNamesByScriptId?: { [name: string]: string };
} = {
  typescriptWorker: new Worker("typescriptWorker.js"),
  
  assetsById: {},
  
  fileNames: [],
  files: {},
  fileNamesByScriptId: {}
};

export let socket: SocketIOClient.Socket; 
function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("welcome", onWelcomed);
  socket.on("disconnect", SupClient.onDisconnected);
}

let onEditCommands: any = {};
function onWelcomed(clientId: number) {
  data.projectClient = new SupClient.ProjectClient(socket);
  data.projectClient.subEntries(entriesSubscriber);

  setupEditor();
  ui.editor.clientId = clientId;
}

var entriesSubscriber = {
  onEntriesReceived: (entries: SupCore.data.Entries) => {
    entries.walk((entry) => {
      if (entry.type !== "script") return;

      var scriptName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
      data.fileNames.push(scriptName);
      data.fileNamesByScriptId[entry.id] = scriptName;
      data.projectClient.subAsset(entry.id, "script", scriptSubscriber);
    })
  },

  onEntryAdded: (newEntry: any, parentId: string, index: number) => {
    if (newEntry.type !== "script") return;

    let scriptName = `${data.projectClient.entries.getPathFromId(newEntry.id)}.ts`;

    let i = 0;
    data.projectClient.entries.walk((entry) => {
      if (entry.type !== "script") return;
      if (entry.id === newEntry.id) data.fileNames.splice(i, 0, scriptName);
      i++;
    });
    data.fileNamesByScriptId[newEntry.id] = scriptName;
    data.projectClient.subAsset(newEntry.id, "script", scriptSubscriber);
  },

  onEntryMoved: (id: string, parentId: string, index: number) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script") return;

    let oldFileName = data.fileNamesByScriptId[id];

    let newFileName = `${data.projectClient.entries.getPathFromId(id)}.ts`;

    data.fileNames.splice(data.fileNames.indexOf(oldFileName), 1);
    let i = 0;
    data.projectClient.entries.walk((entry) => {
      if (entry.type !== "script") return;
      if (entry.id === id) data.fileNames.splice(i, 0, newFileName);
      i++;
    });

    data.fileNamesByScriptId[id] = newFileName;
    let file = data.files[oldFileName];
    data.files[newFileName] = file;
    if (newFileName !== oldFileName) delete data.files[oldFileName];

    data.typescriptWorker.postMessage({ type: "removeFile", fileName: oldFileName });
    data.typescriptWorker.postMessage({ type: "addFile", fileName: newFileName, index: data.fileNames.indexOf(newFileName), file });
    scheduleErrorCheck();
  },

  onSetEntryProperty: (id: string, key: string, value: any) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script" || key !== "name") return;

    let oldScriptName = data.fileNamesByScriptId[id];
    let newScriptName = `${data.projectClient.entries.getPathFromId(entry.id)}.ts`;
    if (newScriptName === oldScriptName) return;

    let scriptIndex = data.fileNames.indexOf(oldScriptName);
    data.fileNames[scriptIndex] = newScriptName;
    data.fileNamesByScriptId[id] = newScriptName;
    data.files[newScriptName] = data.files[oldScriptName];
    delete data.files[oldScriptName];
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
}

let allScriptsReceived = false;

var scriptSubscriber = {
  onAssetReceived: (err: string, asset: ScriptAsset) => {
    data.assetsById[asset.id] = asset;
    let fileName = `${data.projectClient.entries.getPathFromId(asset.id)}.ts`;
    let file = { id: asset.id, text: asset.pub.text, version: asset.pub.revisionId.toString() }
    data.files[fileName] = file;

    if (asset.id === info.assetId) {
      data.asset = asset;

      (<any>ui.errorPaneStatus.classList.toggle)("has-draft", data.asset.hasDraft);
      ui.editor.setup(data.asset.pub.draft);
      if (info.line != null && info.ch != null)
        ui.editor.codeMirrorInstance.getDoc().setCursor({ line: info.line, ch: info.ch });
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
    if (id !== info.assetId) {
      if (command === "saveText") {
        let fileName = `${data.projectClient.entries.getPathFromId(id)}.ts`;
        let asset = data.assetsById[id];
        let file = data.files[fileName];
        file.text = asset.pub.text;
        file.version = asset.pub.revisionId.toString();

        data.typescriptWorker.postMessage({ type: "updateFile", fileName, text: file.text, version: file.version });
        scheduleErrorCheck();
      }
      return
    }

    if (onAssetCommands[command] != null) onAssetCommands[command].apply(data.asset, args);
  },

  onAssetTrashed: (id: string) => {
    if (id !== info.assetId) return;

    ui.editor.clear();
    if (ui.errorCheckTimeout != null) clearTimeout(ui.errorCheckTimeout);
    if (ui.completionTimeout != null) clearTimeout(ui.completionTimeout);
    SupClient.onAssetTrashed();
  },
}

var onAssetCommands: any = {};
onAssetCommands.editText = (operationData: OperationData) => {
  ui.errorPaneStatus.classList.add("has-draft");
  ui.editor.receiveEditText(operationData);
}

onAssetCommands.saveText = () => {
  ui.errorPaneStatus.classList.remove("has-draft");
}

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
        ui.editor.codeMirrorInstance.addWidget(ui.infoPosition, ui.infoElement, false)
      }
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
    name: data.fileNamesByScriptId[info.assetId],
    start: activeCompletion.start
  });
}

export function setNextCompletion(completion: CompletionRequest) {
  nextCompletion = completion;
  if(activeCompletion == null) startAutocomplete();
}

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
  data.fileNames.push("lib.d.ts");
  data.files["lib.d.ts"] = { id: "lib.d.ts", text: globalDefs, version: "" };

  // Start
  start();
});