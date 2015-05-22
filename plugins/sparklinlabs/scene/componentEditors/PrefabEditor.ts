export default class PrefabEditor {
  projectClient: SupClient.ProjectClient
  editConfig: any;
  sceneAssetId: string;

  sceneTextField: HTMLInputElement;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.sceneAssetId = config.sceneAssetId;

    let sceneRow = SupClient.table.appendRow(tbody, "Scene");
    this.sceneTextField = SupClient.table.appendTextField(sceneRow.valueCell, "");
    this.sceneTextField.disabled = true;

    this.sceneTextField.addEventListener("input", this._onChangeSceneAsset);

    this.projectClient.subEntries(this);
  }

  destroy() {
    this.projectClient.unsubEntries(this);

    if (this.sceneAssetId != null) this.projectClient.unsubAsset(this.sceneAssetId, this);
  }

  config_setProperty(path: string, value: any) {
    if (this.projectClient.entries == null) return;

    switch (path) {
      case "sceneAssetId":
        if (this.sceneAssetId != null) this.projectClient.unsubAsset(this.sceneAssetId, this);
        this.sceneAssetId = value;

        if (this.sceneAssetId != null) {
          this.sceneTextField.value = this.projectClient.entries.getPathFromId(this.sceneAssetId);
          this.projectClient.subAsset(this.sceneAssetId, "scene", this);
        }
        else this.sceneTextField.value = "";
        break;
      }
  }

  _onChangeSceneAsset = (event: any) => {
    if (event.target.value === "") {
      this.editConfig("setProperty", "sceneAssetId", null);
    }
    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "scene") {
        this.editConfig("setProperty", "sceneAssetId", entry.id);
      }
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.data.Entries) {
    this.sceneTextField.disabled = false;

    if (entries.byId[this.sceneAssetId] != null) {
      this.sceneTextField.value = entries.getPathFromId(this.sceneAssetId);
      this.projectClient.subAsset(this.sceneAssetId, "scene", this);
    }
  }

  onEntryAdded(entry: any, parentId: string, index: number) {}
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id !== this.sceneAssetId) return;
    this.sceneTextField.value = this.projectClient.entries.getPathFromId(this.sceneAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {}
  onEntryTrashed(id: string) {}

  onAssetReceived(assetId: string, asset: any) {}
  onAssetEdited(assetId: string, command: string, ...args: any[]) {}
  onAssetTrashed() { this.sceneTextField.value = ""; }
}
