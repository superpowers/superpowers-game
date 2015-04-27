import ModelAsset from "../data/ModelAsset";

export default class ModelRendererEditor {
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  modelAssetId: string;
  animationId: string;

  modelTextField: HTMLInputElement;
  animationSelectBox: HTMLSelectElement;

  asset: ModelAsset;

  constructor(tbody: HTMLDivElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.modelAssetId = config.modelAssetId;
    this.animationId = config.animationId;

    let modelRow = SupClient.component.createSetting(tbody, "Model");
    this.modelTextField = SupClient.component.createTextField(modelRow.valueElt, "");
    this.modelTextField.disabled = true;

    let animationRow = SupClient.component.createSetting(tbody, "Animation");
    this.animationSelectBox = SupClient.component.createSelectBox(animationRow.valueElt, { "": "(None)" });
    this.animationSelectBox.disabled = true;

    this.modelTextField.addEventListener("input", this._onChangeModelAsset);
    this.animationSelectBox.addEventListener("change", this._onChangeModelAnimation);

    this.projectClient.subEntries(this);
  }

  destroy() {
    this.projectClient.unsubEntries(this);

    if (this.modelAssetId != null) {
      this.projectClient.unsubAsset(this.modelAssetId, this);
    }
  }

  config_setProperty(path: string, value: any) {
    if (this.projectClient.entries == null) return;

    switch(path) {
      case "modelAssetId":
        if (this.modelAssetId != null) this.projectClient.unsubAsset(this.modelAssetId, this);
        this.modelAssetId = value;
        this.animationSelectBox.disabled = true;

        this.projectClient.subAsset(this.modelAssetId, "model", this);

        this.modelTextField.value = this.projectClient.entries.getPathFromId(this.modelAssetId);
        break;

      case "animationId":
        if (! this.animationSelectBox.disabled) {
          this.animationSelectBox.value = (value != null) ? value : "";
        }

        this.animationId = value;
        break;
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.data.Entries) {
    this.modelTextField.disabled = false;

    if (entries.byId[this.modelAssetId] !=  null) {
      this.modelTextField.value = entries.getPathFromId(this.modelAssetId);
    }

    this.projectClient.subAsset(this.modelAssetId, "model", this);
  }

  onEntryAdded(entry: any, parentId: string, index: number) {}
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id != this.modelAssetId) return;
    this.modelTextField.value = this.projectClient.entries.getPathFromId(this.modelAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id != this.modelAssetId) return;
    this.modelTextField.value = this.projectClient.entries.getPathFromId(this.modelAssetId);
  }
  onEntryTrashed(id: string) {}

  onAssetReceived(assetId: string, asset: any) {
    if (assetId != this.modelAssetId) return;
    this.asset = asset;

    this._clearAnimations();

    for (let animation of this.asset.pub.animations) {
      SupClient.component.createSelectOption(this.animationSelectBox, animation.id, animation.name);
    }

    this.animationSelectBox.value = (this.animationId != null) ? this.animationId : "";
    this.animationSelectBox.disabled = false;
  }

  onAssetEdited(assetId: string, command: string, ...args: any[]) {
    if (assetId !== this.modelAssetId) return;
    if (command.indexOf("Animation") === -1) return;

    let animationId = this.animationSelectBox.value;

    this._clearAnimations();

    for (let animation of this.asset.pub.animations) {
      SupClient.component.createSelectOption(this.animationSelectBox, animation.id, animation.name);
    }

    if (animationId != null && this.asset.animations.byId[animationId] != null) this.animationSelectBox.value = animationId;
    else this.editConfig("setProperty", "animationId", "");
  }

  onAssetTrashed() {
    this._clearAnimations();

    this.modelTextField.value = "";
    this.animationSelectBox.value = "";
    this.animationSelectBox.disabled = true;
  }

  // User interface
  _clearAnimations() {
    while (true) {
      let child = this.animationSelectBox.children[1];
      if (child == null) break;
      this.animationSelectBox.removeChild(child);
    }
  }

  _onChangeModelAsset = (event: any) => {
    let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
    if (entry != null && entry.type == "model") {
      this.editConfig("setProperty", "modelAssetId", entry.id);
      this.editConfig("setProperty", "animationId", null);
    }
  }

  _onChangeModelAnimation = (event: any) => {
    let animationId = (event.target.value == "") ? null : event.target.value;
    this.editConfig("setProperty", "animationId", animationId);
  }
}
