import { ModelRendererConfigPub } from "../data/ModelRendererConfig";
import ModelAsset from "../data/ModelAsset";

export default class ModelRendererEditor {
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  modelAssetId: string;
  animationId: string;

  modelTextField: HTMLInputElement;
  animationSelectBox: HTMLSelectElement;
  castShadowField: HTMLInputElement;
  receiveShadowField: HTMLInputElement;

  color: { r: number; g: number; b: number; };
  colorFields: HTMLInputElement[];
  colorPicker: HTMLInputElement;

  materialSelectBox: HTMLSelectElement;

  asset: ModelAsset;

  constructor(tbody: HTMLTableSectionElement, config: ModelRendererConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.modelAssetId = config.modelAssetId;
    this.animationId = config.animationId;

    let modelRow = SupClient.table.appendRow(tbody, "Model");
    this.modelTextField = SupClient.table.appendTextField(modelRow.valueCell, "");
    this.modelTextField.addEventListener("input", this._onChangeModelAsset);
    this.modelTextField.disabled = true;

    let animationRow = SupClient.table.appendRow(tbody, "Animation");
    this.animationSelectBox = SupClient.table.appendSelectBox(animationRow.valueCell, { "": "(None)" });
    this.animationSelectBox.addEventListener("change", this._onChangeModelAnimation);
    this.animationSelectBox.disabled = true;

    let castShadowRow = SupClient.table.appendRow(tbody, "Cast Shadow");
    this.castShadowField = SupClient.table.appendBooleanField(castShadowRow.valueCell, config.castShadow);
    this.castShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "castShadow", event.target.checked);
    })
    this.castShadowField.disabled = true;

    let receiveShadowRow = SupClient.table.appendRow(tbody, "Receive Shadow");
    this.receiveShadowField = SupClient.table.appendBooleanField(receiveShadowRow.valueCell, config.receiveShadow);
    this.receiveShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "receiveShadow", event.target.checked);
    })
    this.receiveShadowField.disabled = true;

    let colorRow = SupClient.table.appendRow(tbody, "Color");
    this.colorFields = SupClient.table.appendNumberFields(colorRow.valueCell, [config.color.r, config.color.g, config.color.b], 0);
    this.colorFields[0].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color.r", parseFloat(event.target.value));
    });
    this.colorFields[1].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color.g", parseFloat(event.target.value));
    });
    this.colorFields[2].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color.b", parseFloat(event.target.value));
    });
    for (let colorField of this.colorFields) {
      colorField.step = "0.1";
      colorField.disabled = true;
    }
    this.colorPicker = document.createElement("input");
    this.colorPicker.style.width = "60%";
    this.colorPicker.style.padding = "0";
    this.colorPicker.style.alignSelf = "center";
    this.colorPicker.type = "color";
    this.color = config.color;
    this._setColorPicker(this.color);
    this.colorPicker.addEventListener("change", (event: any) => {
      let r = parseInt(event.target.value.slice(1, 3), 16) / 255;
      let g = parseInt(event.target.value.slice(3, 5), 16) / 255;
      let b = parseInt(event.target.value.slice(5, 7), 16) / 255;
      this.editConfig("setProperty", "color", { r, g, b });
    })
    this.colorFields[0].parentElement.appendChild(this.colorPicker);

    let materialRow = SupClient.table.appendRow(tbody, "Material");
    this.materialSelectBox = SupClient.table.appendSelectBox(materialRow.valueCell, { "basic": "Basic", "phong": "Phong" }, config.materialType);
    this.materialSelectBox.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "materialType", event.target.value);
    })
    this.materialSelectBox.disabled = true;

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

        if (this.modelAssetId != null) {
          this.projectClient.subAsset(this.modelAssetId, "model", this);
          this.modelTextField.value = this.projectClient.entries.getPathFromId(this.modelAssetId);
        }
        else this.modelTextField.value = "";
        break;

      case "animationId":
        if (! this.animationSelectBox.disabled) {
          this.animationSelectBox.value = (value != null) ? value : "";
        }

        this.animationId = value;
        break;

      case "castShadow":
        this.castShadowField.value = value;
        break;

      case "receiveShadow":
        this.receiveShadowField.value = value;
        break;

      case "color":
        this.color = value;
        this.colorFields[0].value = value.r;
        this.colorFields[1].value = value.g;
        this.colorFields[2].value = value.b;
        this._setColorPicker(this.color);
        break;
      case "color.r":
        this.color.r = value;
        this.colorFields[0].value = value;
        this._setColorPicker(this.color);
        break;
      case "color.g":
        this.color.g = value;
        this.colorFields[1].value = value;
        this._setColorPicker(this.color);
        break;
      case "color.b":
        this.color.b = value;
        this.colorFields[2].value = value;
        this._setColorPicker(this.color);
        break;

      case "materialType":
        this.materialSelectBox.value = value;
        break;
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.data.Entries) {
    this.modelTextField.disabled = false;
    this.materialSelectBox.disabled = false;
    this.castShadowField.disabled = false;
    this.receiveShadowField.disabled = false;
    for (let colorField of this.colorFields) colorField.disabled = false;

    if (entries.byId[this.modelAssetId] != null) {
      this.modelTextField.value = entries.getPathFromId(this.modelAssetId);
      this.projectClient.subAsset(this.modelAssetId, "model", this);
    }
  }

  onEntryAdded(entry: any, parentId: string, index: number) {}
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id !== this.modelAssetId) return;
    this.modelTextField.value = this.projectClient.entries.getPathFromId(this.modelAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id !== this.modelAssetId) return;
    this.modelTextField.value = this.projectClient.entries.getPathFromId(this.modelAssetId);
  }
  onEntryTrashed(id: string) {}

  onAssetReceived(assetId: string, asset: any) {
    if (assetId !== this.modelAssetId) return;
    this.asset = asset;

    this._clearAnimations();

    for (let animation of this.asset.pub.animations) {
      SupClient.table.appendSelectOption(this.animationSelectBox, animation.id, animation.name);
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
      SupClient.table.appendSelectOption(this.animationSelectBox, animation.id, animation.name);
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
    if (event.target.value === "") {
      this.editConfig("setProperty", "modelAssetId", null);
      this.editConfig("setProperty", "animationId", null);
    }
    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "model") {
        this.editConfig("setProperty", "modelAssetId", entry.id);
        this.editConfig("setProperty", "animationId", null);
      }
    }
  }

  _onChangeModelAnimation = (event: any) => {
    let animationId = (event.target.value === "") ? null : event.target.value;
    this.editConfig("setProperty", "animationId", animationId);
  }

  _setColorPicker(color: { r: number, g: number, b: number }) {
    let rStr = (Math.round(color.r*255)).toString(16);
    if (rStr.length === 1) rStr = `0${rStr}`;

    let gStr = (Math.round(color.g*255)).toString(16);
    if (gStr.length === 1) gStr = `0${gStr}`;

    let bStr = (Math.round(color.b*255)).toString(16);
    if (bStr.length === 1) bStr = `0${bStr}`;

    this.colorPicker.value = `#${rStr}${gStr}${bStr}`;
  }
}
