import { SpriteRendererConfigPub } from "../data/SpriteRendererConfig";
import SpriteAsset from "../data/SpriteAsset";

export default class SpriteRendererEditor {
  tbody: HTMLTableSectionElement
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  spriteAssetId: string;
  animationId: string;
  shaderAssetId: string;

  spriteTextField: HTMLInputElement;
  spriteButtonElt: HTMLButtonElement;
  animationSelectBox: HTMLSelectElement;
  horizontalFlipField: HTMLInputElement;
  verticalFlipField: HTMLInputElement;
  castShadowField: HTMLInputElement;
  receiveShadowField: HTMLInputElement;
  colorField: HTMLInputElement;
  colorPicker: HTMLInputElement;
  overrideOpacityField: HTMLInputElement;
  transparentField: HTMLInputElement;
  opacityField: HTMLInputElement;
  materialSelectBox: HTMLSelectElement;
  shaderTextField: HTMLInputElement;
  shaderButtonElt: HTMLButtonElement;

  asset: SpriteAsset;

  constructor(tbody: HTMLTableSectionElement, config: SpriteRendererConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.spriteAssetId = config.spriteAssetId;
    this.animationId = config.animationId;
    this.shaderAssetId = config.shaderAssetId;

    let spriteRow = SupClient.table.appendRow(tbody, "Sprite");
    let spriteFields = SupClient.table.appendAssetField(spriteRow.valueCell, "");
    this.spriteTextField = spriteFields.textField;
    this.spriteTextField.addEventListener("input", this._onChangeSpriteAsset);
    this.spriteTextField.disabled = true;
    this.spriteButtonElt = spriteFields.buttonElt;
    this.spriteButtonElt.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.spriteAssetId }, (<any>window.location).origin);
    });
    this.spriteButtonElt.disabled = this.spriteAssetId == null;

    let animationRow = SupClient.table.appendRow(tbody, "Animation");
    this.animationSelectBox = SupClient.table.appendSelectBox(animationRow.valueCell, { "": "(None)" });
    this.animationSelectBox.addEventListener("change", this._onChangeSpriteAnimation);
    this.animationSelectBox.disabled = true;

    let flipRow = SupClient.table.appendRow(tbody, "Flip");
    let flipDiv = <any>document.createElement("div");
    flipDiv.classList.add("inputs");
    flipRow.valueCell.appendChild(flipDiv);

    let horizontalSpan = document.createElement("span");
    horizontalSpan.style.marginLeft = "5px";
    horizontalSpan.textContent = "H";
    flipDiv.appendChild(horizontalSpan);
    this.horizontalFlipField = SupClient.table.appendBooleanField(flipDiv, config.horizontalFlip);
    this.horizontalFlipField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "horizontalFlip", event.target.checked);
    });

    let verticalSpan = document.createElement("span");
    verticalSpan.style.marginLeft = "5px";
    verticalSpan.textContent = "V";
    flipDiv.appendChild(verticalSpan);
    this.verticalFlipField = SupClient.table.appendBooleanField(flipDiv, config.verticalFlip);
    this.verticalFlipField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "verticalFlip", event.target.checked);
    });

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
    let shaderFields = SupClient.table.appendAssetField(shaderRow.valueCell, "");
    this.shaderTextField = shaderFields.textField;
    this.shaderTextField.addEventListener("input", this._onChangeShaderAsset);
    this.shaderTextField.disabled = true;
    this.shaderButtonElt = shaderFields.buttonElt;
    this.shaderButtonElt.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.shaderAssetId }, (<any>window.location).origin);
    });
    this.shaderButtonElt.disabled = this.shaderAssetId == null;
    this._updateShaderField(config.materialType);

    this.projectClient.subEntries(this);
  }

  destroy() {
    this.projectClient.unsubEntries(this);

    if (this.spriteAssetId != null) this.projectClient.unsubAsset(this.spriteAssetId, this);
  }

  config_setProperty(path: string, value: any) {
    if (this.projectClient.entries == null) return;

    switch (path) {
      case "spriteAssetId":
        if (this.spriteAssetId != null) this.projectClient.unsubAsset(this.spriteAssetId, this);
        this.spriteAssetId = value;
        this.spriteButtonElt.disabled = this.spriteAssetId == null;
        this.animationSelectBox.disabled = true;

        if (this.spriteAssetId != null) {
          this.spriteTextField.value = this.projectClient.entries.getPathFromId(this.spriteAssetId);
          this.projectClient.subAsset(this.spriteAssetId, "sprite", this);
        }
        else this.spriteTextField.value = "";
        break;

      case "animationId":
        if (! this.animationSelectBox.disabled) this.animationSelectBox.value = (value != null) ? value : "";
        this.animationId = value;
        break;

      case "horizontalFlip":
        this.horizontalFlipField.checked = value;
        break;

      case "verticalFlip":
        this.verticalFlipField.checked = value;
        break;

      case "castShadow":
        this.castShadowField.checked = value;
        break;

      case "receiveShadow":
        this.receiveShadowField.checked = value;
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
        this.shaderButtonElt.disabled = this.shaderAssetId == null;
        if (value != null) this.shaderTextField.value = this.projectClient.entries.getPathFromId(value);
        else this.shaderTextField.value = "";
        break;
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.data.Entries) {
    this.spriteTextField.disabled = false;
    this.castShadowField.disabled = false;
    this.receiveShadowField.disabled = false;
    this.colorField.disabled = false;
    this.colorPicker.disabled = false;
    this.materialSelectBox.disabled = false;
    this.shaderTextField.disabled = false;

    if (entries.byId[this.spriteAssetId] != null) {
      this.spriteTextField.value = entries.getPathFromId(this.spriteAssetId);
      this.projectClient.subAsset(this.spriteAssetId, "sprite", this);
    }

    if (entries.byId[this.shaderAssetId] != null) {
      this.shaderTextField.value = entries.getPathFromId(this.shaderAssetId);
    }
  }

  onEntryAdded(entry: any, parentId: string, index: number) {}
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id === this.spriteAssetId) {
      this.spriteTextField.value = this.projectClient.entries.getPathFromId(this.spriteAssetId);
    } else if (id === this.shaderAssetId) {
      this.shaderTextField.value = this.projectClient.entries.getPathFromId(this.shaderAssetId);
    }
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (key !== "name") return;

    if (id === this.spriteAssetId) {
      this.spriteTextField.value = this.projectClient.entries.getPathFromId(this.spriteAssetId);
    } else if (id === this.shaderAssetId) {
      this.shaderTextField.value = this.projectClient.entries.getPathFromId(this.shaderAssetId);
    }
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

  _updateShaderField(materialType: string) {
    let shaderRow = this.shaderTextField.parentElement.parentElement.parentElement;
    if (materialType === "shader") {
      if (shaderRow.parentElement == null) this.tbody.appendChild(shaderRow);
    } else if (shaderRow.parentElement != null) shaderRow.parentElement.removeChild(shaderRow);
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

  _onChangeShaderAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "shaderAssetId", null);
    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "shader") this.editConfig("setProperty", "shaderAssetId", entry.id);
    }
  }
}
