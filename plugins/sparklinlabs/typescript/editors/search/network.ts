import { searchAsset, refreshFileStatus } from "./ui";

import ScriptAsset from "../../data/ScriptAsset";

export let data: {
  assetsById?: { [id: string]: ScriptAsset; }
  projectClient?: SupClient.ProjectClient,
} = {};

export let socket: SocketIOClient.Socket;
SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "searchEditor" }], () => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
});

let scriptSubscriber = {
  onAssetReceived: (err: string, asset: ScriptAsset) => {
    data.assetsById[asset.id] = asset;
    searchAsset(asset.id);
  },

  onAssetEdited: (id: string, command: string, ...args: any[]) => {
    if (command === "editText") searchAsset(id);
  },

  onAssetTrashed: (id: string) => { /* Nothing to do here */ },
};

let entriesSubscriber = {
  onEntriesReceived: (entries: SupCore.Data.Entries) => {
    entries.walk((entry) => {
      if (entry.type !== "script") return;
      data.projectClient.subAsset(entry.id, "script", scriptSubscriber);
    });
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
      refreshFileStatus(name, nameElt, tableElt.children.length);
    }
  },

  onSetEntryProperty: (id: string, key: string, value: any) => {
    let entry = data.projectClient.entries.byId[id];
    if (entry.type !== "script" || key !== "name") return;

    let nameElt = <HTMLSpanElement>document.querySelector(`span[data-id='${id}']`);
    if (nameElt != null) {
      let tableElt = <HTMLTableElement>document.querySelector(`table[data-id='${id}']`);
      let name = data.projectClient.entries.getPathFromId(id);
      refreshFileStatus(name, nameElt, tableElt.children.length);
    }
  },

  onEntryTrashed: (id: string) => {
    if (data.assetsById[id] != null) delete data.assetsById[id];

    let nameElt = <HTMLSpanElement>document.querySelector(`span[data-id='${id}']`);
    let tableElt = <HTMLTableElement>document.querySelector(`table[data-id='${id}']`);

    if (nameElt != null) nameElt.parentElement.removeChild(nameElt);
    if (tableElt != null) tableElt.parentElement.removeChild(tableElt);
  },
};

function onConnected() {
  data.assetsById = {};

  data.projectClient = new SupClient.ProjectClient(socket);
  data.projectClient.subEntries(entriesSubscriber);
}
