import SpriteAsset from "../data/SpriteAsset";

export default class SpriteRendererEditor {
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  spriteAssetId: string;
  animationId: string;

  spriteTextField: HTMLInputElement;
  animationSelectBox: HTMLSelectElement;

  asset: SpriteAsset;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.spriteAssetId = config.spriteAssetId;
    this.animationId = config.animationId;

    let spriteRow = SupClient.table.appendRow(tbody, "Sprite");
    this.spriteTextField = SupClient.table.appendTextField(spriteRow.valueCell, "");
    this.spriteTextField.disabled = true;

    let animationRow = SupClient.table.appendRow(tbody, "Animation");
    this.animationSelectBox = SupClient.table.appendSelectBox(animationRow.valueCell, { "": "(None)" });
    this.animationSelectBox.disabled = true;

    this.spriteTextField.addEventListener("input", this._onChangeSpriteAsset);
    this.animationSelectBox.addEventListener("change", this._onChangeSpriteAnimation);

    this.projectClient.subEntries(this);
  }

  destroy() {
    this.projectClient.unsubEntries(this);

    if (this.spriteAssetId != null) this.projectClient.unsubAsset(this.spriteAssetId, this);
  }

  config_setProperty(path: string, value: any) {
    if (this.projectClient.entries == null) return;

    switch (path) {
      case "spriteAssetId": {
        if (this.spriteAssetId != null) this.projectClient.unsubAsset(this.spriteAssetId, this);
        this.spriteAssetId = value;
        this.animationSelectBox.disabled = true;

        if (this.spriteAssetId != null) {
          this.spriteTextField.value = this.projectClient.entries.getPathFromId(this.spriteAssetId);
          this.projectClient.subAsset(this.spriteAssetId, "sprite", this);
        }
        else this.spriteTextField.value = "";
        break;
      }

      case "animationId": {
        if (! this.animationSelectBox.disabled) this.animationSelectBox.value = (value != null) ? value : "";
        this.animationId = value;
        break;
      }
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.data.Entries) {
    this.spriteTextField.disabled = false;

    if (entries.byId[this.spriteAssetId] != null) {
      this.spriteTextField.value = entries.getPathFromId(this.spriteAssetId);
      this.projectClient.subAsset(this.spriteAssetId, "sprite", this);
    }
  }

  onEntryAdded(entry: any, parentId: string, index: number) {}
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id !== this.spriteAssetId) return;
    this.spriteTextField.value = this.projectClient.entries.getPathFromId(this.spriteAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id !== this.spriteAssetId) return;
    this.spriteTextField.value = this.projectClient.entries.getPathFromId(this.spriteAssetId);
  }
  onEntryTrashed(id: string) {}

  onAssetReceived(assetId: string, asset: any) {
    if (assetId !== this.spriteAssetId) return;
    this.asset = asset;

    this._clearAnimations();

    for (let animation of this.asset.pub.animations) {
      SupClient.table.appendSelectOption(this.animationSelectBox, animation.id, animation.name);
    }

    this.animationSelectBox.value = (this.animationId != null) ? this.animationId : "";
    this.animationSelectBox.disabled = false;
  }

  onAssetEdited(assetId: string, command: string, ...args: any[]) {
    if (assetId !== this.spriteAssetId) return;
    if (command.indexOf("Animation") === -1) return;

    let animationId = this.animationSelectBox.value;

    this._clearAnimations();

    for (let animation of this.asset.pub.animations) {
      SupClient.table.appendSelectOption(this.animationSelectBox, animation.id, animation.name);
    }

    if (animationId != null && this.asset.animations.byId[animationId] != null) this.animationSelectBox.value = animationId;
    else this.editConfig("setProperty", "animationId", "");
  }

  onAssetTrashed() {
    this._clearAnimations();

    this.spriteTextField.value = "";
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

  _onChangeSpriteAsset = (event: any) => {
    if (event.target.value === "") {
      this.editConfig("setProperty", "spriteAssetId", null);
      this.editConfig("setProperty", "animationId", null);
    }
    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "sprite") {
        this.editConfig("setProperty", "spriteAssetId", entry.id);
        this.editConfig("setProperty", "animationId", null);
      }
    }
    }

  _onChangeSpriteAnimation = (event: any) => {
    let animationId = (event.target.value === "") ? null : event.target.value;
    this.editConfig("setProperty", "animationId", animationId);
  }
}
