import info from "./info";
import { searchAsset } from "./ui";

import ScriptAsset from "../../data/ScriptAsset";

export let data: {
  assetsById?: { [id: string]: ScriptAsset; }
  projectClient?: SupClient.ProjectClient,
} = {};

export let socket = SupClient.connect(info.projectId);
socket.on("connect", onConnected);
socket.on("disconnect", SupClient.onDisconnected);

let onEditCommands: any = {};
function onConnected() {
  data.assetsById = {};
  
  data.projectClient = new SupClient.ProjectClient(socket);
  data.projectClient.subEntries(entriesSubscriber);
}

var entriesSubscriber = {
  onEntriesReceived: (entries: SupCore.data.Entries) => {
    entries.walk((entry) => {
      if (entry.type !== "script") return;
      data.projectClient.subAsset(entry.id, "script", scriptSubscriber);
    })
  },

  onEntryAdded: (newEntry: any, parentId: string, index: number) => {
    if (newEntry.type !== "script") return;
    data.projectClient.subAsset(newEntry.id, "script", scriptSubscriber);
  },

  onEntryMoved: (id: string, parentId: string, index: number) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script") return;

    let nameElt = <HTMLSpanElement>document.querySelector(`span[data-id='${id}']`);
    if (nameElt != null) {
      let tableElt = <HTMLTableElement>document.querySelector(`table[data-id='${id}']`);
      let name = data.projectClient.entries.getPathFromId(id);
      nameElt.textContent = `${tableElt.children.length} results in "${name}.ts"`;
    }
  },

  onSetEntryProperty: (id: string, key: string, value: any) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script" || key !== "name") return;

    let nameElt = <HTMLSpanElement>document.querySelector(`span[data-id='${id}']`);
    if (nameElt != null) {
      let tableElt = <HTMLTableElement>document.querySelector(`table[data-id='${id}']`);
      let name = data.projectClient.entries.getPathFromId(id);
      nameElt.textContent = `${tableElt.children.length} results in "${name}.ts"`;
    }
  },

  onEntryTrashed: (id: string) => {
    if (data.assetsById[id] != null) delete data.assetsById[id];
    
    let nameElt = <HTMLSpanElement>document.querySelector(`span[data-id='${id}']`);
    let tableElt = <HTMLTableElement>document.querySelector(`table[data-id='${id}']`);
    
    if (nameElt != null) nameElt.parentElement.removeChild(nameElt);
    if (tableElt != null) tableElt.parentElement.removeChild(tableElt);
  },
}

var scriptSubscriber = {
  onAssetReceived: (err: string, asset: ScriptAsset) => {
    data.assetsById[asset.id] = asset;
    searchAsset(asset.id);
  },

  onAssetEdited: (id: string, command: string, ...args: any[]) => {
    if (command === "editText") searchAsset(id);
  },

  onAssetTrashed: (id: string) => {},
}