import { ModelRendererConfigPub } from "../data/ModelRendererConfig";
import ModelAsset from "../data/ModelAsset";

export default class ModelRendererEditor {
  tbody: HTMLTableSectionElement
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  modelAssetId: string;
  animationId: string;
  shaderAssetId: string;

  modelTextField: HTMLInputElement;
  animationSelectBox: HTMLSelectElement;
  castShadowField: HTMLInputElement;
  receiveShadowField: HTMLInputElement;

  colorField: HTMLInputElement;
  colorPicker: HTMLInputElement;

  overrideOpacityField: HTMLInputElement;
  transparentField: HTMLInputElement;
  opacityField: HTMLInputElement;

  materialSelectBox: HTMLSelectElement;
  shaderTextField: HTMLInputElement;

  asset: ModelAsset;

  constructor(tbody: HTMLTableSectionElement, config: ModelRendererConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.modelAssetId = config.modelAssetId;
    this.animationId = config.animationId;
    this.shaderAssetId = config.shaderAssetId;

    let modelRow = SupClient.table.appendRow(tbody, "Model");
    this.modelTextField = SupClient.table.appendTextField(modelRow.valueCell, "");
    this.modelTextField.addEventListener("input", this._onChangeModelAsset);
    this.modelTextField.disabled = true;

    let animationRow = SupClient.table.appendRow(tbody, "Animation");
    this.animationSelectBox = SupClient.table.appendSelectBox(animationRow.valueCell, { "": "(None)" });
    this.animationSelectBox.addEventListener("change", this._onChangeModelAnimation);
    this.animationSelectBox.disabled = true;

    let shadowRow = SupClient.table.appendRow(tbody, "Shadow");
    let shadowDiv = <any>document.createElement("div");
    shadowDiv.classList.add("inputs");
    shadowRow.valueCell.appendChild(shadowDiv);

    let castSpan = document.createElement("span");
    castSpan.style.marginLeft = "5px";
    castSpan.textContent = "Cast";
    shadowDiv.appendChild(castSpan);
    this.castShadowField = SupClient.table.appendBooleanField(shadowDiv, config.castShadow);
    this.castShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "castShadow", event.target.checked);
    });
    this.castShadowField.disabled = true;

    let receiveSpan = document.createElement("span");
    receiveSpan.style.marginLeft = "5px";
    receiveSpan.textContent = "Receive";
    shadowDiv.appendChild(receiveSpan);
    this.receiveShadowField = SupClient.table.appendBooleanField(shadowDiv, config.receiveShadow);
    this.receiveShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "receiveShadow", event.target.checked);
    });
    this.receiveShadowField.disabled = true;

    let colorRow = SupClient.table.appendRow(tbody, "Color");
    let colorInputs = SupClient.table.appendColorField(colorRow.valueCell, config.color);

    this.colorField = colorInputs.textField;
    this.colorField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color", event.target.value);
    });
    this.colorField.disabled = true;

    this.colorPicker = colorInputs.pickerField;
    this.colorPicker.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color", event.target.value.slice(1));
    });
    this.colorPicker.disabled = true;

    let opacityRow = SupClient.table.appendRow(tbody, "Opacity", { checkbox: true } );
    this.overrideOpacityField = opacityRow.checkbox;
    this.overrideOpacityField.checked = config.overrideOpacity;
    this.overrideOpacityField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "overrideOpacity", event.target.checked);
    });

    let opacityParent = document.createElement("div");
    opacityParent.style.display = "flex";
    opacityParent.style.alignItems = "center";
    opacityRow.valueCell.appendChild(opacityParent);

    this.transparentField = SupClient.table.appendBooleanField(<any>opacityParent, config.opacity != null);
    this.transparentField.style.width = "50%";
    this.transparentField.style.borderRight = "1px solid #ccc";
    this.transparentField.addEventListener("change", (event: any) => {
      let opacity = (event.target.checked) ? 1 : null;
      this.editConfig("setProperty", "opacity", opacity);
    });
    this.transparentField.disabled = ! config.overrideOpacity;

    this.opacityField = SupClient.table.appendNumberField(<any>opacityParent, config.opacity, 0, 1);
    this.opacityField.addEventListener("input", (event: any) => {
      this.editConfig("setProperty", "opacity", parseFloat(event.target.value));
    });
    this.opacityField.step = "0.1";
    this.opacityField.disabled = ! config.overrideOpacity;

    let materialRow = SupClient.table.appendRow(tbody, "Material");
    this.materialSelectBox = SupClient.table.appendSelectBox(materialRow.valueCell, { "basic": "Basic", "phong": "Phong", "shader": "Shader" }, config.materialType);
    this.materialSelectBox.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "materialType", event.target.value);
    })
    this.materialSelectBox.disabled = true;

    let shaderRow = SupClient.table.appendRow(tbody, "Shader");
    this.shaderTextField = SupClient.table.appendTextField(shaderRow.valueCell, "");
    this.shaderTextField.addEventListener("input", this._onChangeShaderAsset);
    this.shaderTextField.disabled = true;
    this._updateShaderField(config.materialType);

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
        this.colorField.value = value;
        this.colorPicker.value = `#${value}`;
        break;

      case "overrideOpacity":
        this.overrideOpacityField.checked = value;
        this.transparentField.disabled = ! value;
        this.transparentField.checked = false;
        this.opacityField.value = null;
        this.opacityField.disabled = true;
        break;

      case "opacity":
        this.transparentField.checked = value != null;
        this.opacityField.disabled = value == null;
        this.opacityField.value = value;
        break;

      case "materialType":
        this.materialSelectBox.value = value;
        this._updateShaderField(value);
        break;

      case "shader":
        this.shaderAssetId = value;
        if (value != null) this.shaderTextField.value = this.projectClient.entries.getPathFromId(value);
        else this.shaderTextField.value = "";
        break;
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.data.Entries) {
    this.modelTextField.disabled = false;
    this.materialSelectBox.disabled = false;
    this.castShadowField.disabled = false;
    this.receiveShadowField.disabled = false;
    this.colorField.disabled = false;
    this.colorPicker.disabled = false;
    this.shaderTextField.disabled = false;

    if (entries.byId[this.modelAssetId] != null) {
      this.modelTextField.value = entries.getPathFromId(this.modelAssetId);
      this.projectClient.subAsset(this.modelAssetId, "model", this);
    }

    if (entries.byId[this.shaderAssetId] != null) {
      this.shaderTextField.value = entries.getPathFromId(this.shaderAssetId);
    }
  }

  onEntryAdded(entry: any, parentId: string, index: number) {}
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id === this.modelAssetId) {
      this.modelTextField.value = this.projectClient.entries.getPathFromId(this.modelAssetId);
    } else if (id === this.shaderAssetId) {
      this.shaderTextField.value = this.projectClient.entries.getPathFromId(this.shaderAssetId);
    }
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (key !== "name") return;

    if (id === this.modelAssetId) {
      this.modelTextField.value = this.projectClient.entries.getPathFromId(this.modelAssetId);
    } else if (id === this.shaderAssetId) {
      this.shaderTextField.value = this.projectClient.entries.getPathFromId(this.shaderAssetId);
    }
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

  _updateShaderField(materialType: string) {
    let shaderRow = this.shaderTextField.parentElement.parentElement;
    if (materialType === "shader") {
      if (shaderRow.parentElement == null) this.tbody.appendChild(shaderRow);
    } else if (shaderRow.parentElement != null) shaderRow.parentElement.removeChild(shaderRow);
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

  _onChangeShaderAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "shaderAssetId", null);
    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "shader") this.editConfig("setProperty", "shaderAssetId", entry.id);
    }
  }
}
