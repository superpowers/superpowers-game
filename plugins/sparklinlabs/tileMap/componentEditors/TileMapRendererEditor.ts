export default class TileMapRendererEditor {
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  tileMapAssetId: string;
  tileSetAssetId: string;

  tileMapTextField: HTMLInputElement;
  tileMapButtonElt: HTMLButtonElement;
  tileSetTextField: HTMLInputElement;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    this.tileMapAssetId = config.tileMapAssetId;
    this.tileSetAssetId = config.tileSetAssetId;

    let tileMapRow = SupClient.table.appendRow(tbody, "Map");
    let tileMapFields = SupClient.table.appendAssetField(tileMapRow.valueCell, "");
    this.tileMapTextField = tileMapFields.textField;
    this.tileMapTextField.disabled = true;
    this.tileMapButtonElt = tileMapFields.buttonElt;
    this.tileMapButtonElt.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.tileMapAssetId }, (<any>window.location).origin);
    });
    this.tileMapButtonElt.disabled = this.tileMapAssetId == null;

    let tileSetRow = SupClient.table.appendRow(tbody, "Tile Set");
    this.tileSetTextField = SupClient.table.appendTextField(tileSetRow.valueCell, "");
    this.tileSetTextField.disabled = true;

    this.tileMapTextField.addEventListener("input", this._onChangeTileMapAsset);
    this.tileSetTextField.addEventListener("input", this._onChangeTileSetAsset);

    this.projectClient.subEntries(this);
  }

  destroy() {
    this.projectClient.unsubEntries(this);
  }

  config_setProperty(path: string, value: any) {
    if (this.projectClient.entries == null) return;

    switch (path) {
      case "tileMapAssetId":
        this.tileMapAssetId = value;
        this.tileMapButtonElt.disabled = this.tileMapAssetId == null;
        this.tileMapTextField.value = this.projectClient.entries.getPathFromId(this.tileMapAssetId);
        break;
      case "tileSetAssetId":
        this.tileSetAssetId = value;
        this.tileSetTextField.value = this.projectClient.entries.getPathFromId(this.tileSetAssetId);
        break;
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.data.Entries) {
    this.tileMapTextField.disabled = false;

    if (entries.byId[this.tileMapAssetId] != null) this.tileMapTextField.value = entries.getPathFromId(this.tileMapAssetId);
  }

  onEntryAdded(entry: any, parentId: string, index: number) {}
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id === this.tileMapAssetId) this.tileMapTextField.value = this.projectClient.entries.getPathFromId(this.tileMapAssetId);
    if (id === this.tileSetAssetId) this.tileSetTextField.value = this.projectClient.entries.getPathFromId(this.tileSetAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id === this.tileMapAssetId) this.tileMapTextField.value = this.projectClient.entries.getPathFromId(this.tileMapAssetId);
    if (id === this.tileSetAssetId) this.tileSetTextField.value = this.projectClient.entries.getPathFromId(this.tileSetAssetId);
  }
  onEntryTrashed(id: string) {}

  _onChangeTileMapAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "tileMapAssetId", null);

    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type == "tileMap") this.editConfig("setProperty", "tileMapAssetId", entry.id);
    }
  }

  _onChangeTileSetAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "tileSetAssetId", null);

    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type == "tileSet") this.editConfig("setProperty", "tileSetAssetId", entry.id);
    }
  }
}
