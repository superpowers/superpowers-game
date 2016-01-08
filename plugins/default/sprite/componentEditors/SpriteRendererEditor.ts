import { SpriteRendererConfigPub } from "../componentConfigs/SpriteRendererConfig";
import SpriteAsset from "../data/SpriteAsset";

export default class SpriteRendererEditor {
  tbody: HTMLTableSectionElement;
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
  transparentField: HTMLSelectElement;
  opacityFields: { sliderField: HTMLInputElement; numberField: HTMLInputElement; };

  materialSelectBox: HTMLSelectElement;
  shaderRow: HTMLTableRowElement;
  shaderTextField: HTMLInputElement;
  shaderButtonElt: HTMLButtonElement;

  asset: SpriteAsset;
  overrideOpacity: boolean;
  opacity: number;

  constructor(tbody: HTMLTableSectionElement, config: SpriteRendererConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.spriteAssetId = config.spriteAssetId;
    this.animationId = config.animationId;
    this.shaderAssetId = config.shaderAssetId;

    this.overrideOpacity = config.overrideOpacity;
    this.opacity = config.opacity;

    let spriteRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:SpriteRenderer.sprite"));
    let spriteFields = SupClient.table.appendAssetField(spriteRow.valueCell, "");
    this.spriteTextField = spriteFields.textField;
    this.spriteTextField.addEventListener("input", this.onChangeSpriteAsset);
    this.spriteTextField.disabled = true;
    this.spriteButtonElt = spriteFields.buttonElt;
    this.spriteButtonElt.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.spriteAssetId }, window.location.origin);
    });
    this.spriteButtonElt.disabled = this.spriteAssetId == null;

    let animationRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:SpriteRenderer.animation"));
    this.animationSelectBox = SupClient.table.appendSelectBox(animationRow.valueCell, { "": SupClient.i18n.t("componentEditors:SpriteRenderer.animationNone") });
    this.animationSelectBox.addEventListener("change", this.onChangeSpriteAnimation);
    this.animationSelectBox.disabled = true;

    let flipRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:SpriteRenderer.flip"));
    let flipDiv = document.createElement("div") as HTMLDivElement;
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

    let shadowRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:SpriteRenderer.shadow.title"));
    let shadowDiv = document.createElement("div") as HTMLDivElement;
    shadowDiv.classList.add("inputs");
    shadowRow.valueCell.appendChild(shadowDiv);

    let castSpan = document.createElement("span");
    castSpan.style.marginLeft = "5px";
    castSpan.textContent = SupClient.i18n.t("componentEditors:SpriteRenderer.shadow.cast");
    shadowDiv.appendChild(castSpan);
    this.castShadowField = SupClient.table.appendBooleanField(shadowDiv, config.castShadow);
    this.castShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "castShadow", event.target.checked);
    });
    this.castShadowField.disabled = true;

    let receiveSpan = document.createElement("span");
    receiveSpan.style.marginLeft = "5px";
    receiveSpan.textContent = SupClient.i18n.t("componentEditors:SpriteRenderer.shadow.receive");
    shadowDiv.appendChild(receiveSpan);
    this.receiveShadowField = SupClient.table.appendBooleanField(shadowDiv, config.receiveShadow);
    this.receiveShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "receiveShadow", event.target.checked);
    });
    this.receiveShadowField.disabled = true;

    let colorRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:SpriteRenderer.color"));
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

    let opacityRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:SpriteRenderer.opacity"), { checkbox: true } );
    this.overrideOpacityField = opacityRow.checkbox;
    this.overrideOpacityField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "opacity", this.asset != null ? this.asset.pub.opacity : null);
      this.editConfig("setProperty", "overrideOpacity", event.target.checked);
    });

    let opacityParent = document.createElement("div");
    opacityRow.valueCell.appendChild(opacityParent);

    let transparentOptions: {[key: string]: string} = {
      empty: "",
      opaque: SupClient.i18n.t("componentEditors:SpriteRenderer.opaque"),
      transparent: SupClient.i18n.t("componentEditors:SpriteRenderer.transparent"),
    };
    this.transparentField = SupClient.table.appendSelectBox(opacityParent, transparentOptions);
    (this.transparentField.children[0] as HTMLOptionElement).hidden = true;
    this.transparentField.addEventListener("change", (event) => {
      let opacity = this.transparentField.value === "transparent" ? 1 : null;
      this.editConfig("setProperty", "opacity", opacity);
    });

    this.opacityFields = SupClient.table.appendSliderField(opacityParent, "", { min: 0, max: 1, step: 0.1, sliderStep: 0.01 });
    this.opacityFields.numberField.parentElement.addEventListener("input", (event: any) => {
      this.editConfig("setProperty", "opacity", parseFloat(event.target.value));
    });
    this.updateOpacityField();

    let materialRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:SpriteRenderer.material"));
    this.materialSelectBox = SupClient.table.appendSelectBox(materialRow.valueCell, { "basic": "Basic", "phong": "Phong", "shader": "Shader" }, config.materialType);
    this.materialSelectBox.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "materialType", event.target.value);
    });
    this.materialSelectBox.disabled = true;

    let shaderRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:SpriteRenderer.shader"));
    this.shaderRow = shaderRow.row;
    let shaderFields = SupClient.table.appendAssetField(shaderRow.valueCell, "");
    this.shaderTextField = shaderFields.textField;
    this.shaderTextField.addEventListener("input", this.onChangeShaderAsset);
    this.shaderTextField.disabled = true;
    this.shaderButtonElt = shaderFields.buttonElt;
    this.shaderButtonElt.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.shaderAssetId }, window.location.origin);
    });
    this.shaderButtonElt.disabled = this.shaderAssetId == null;
    this.shaderRow.hidden = config.materialType !== "shader";

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
        if (this.spriteAssetId != null) {
          this.asset = null;
          this.projectClient.unsubAsset(this.spriteAssetId, this);
        }
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
        if (!this.animationSelectBox.disabled) this.animationSelectBox.value = (value != null) ? value : "";
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
        this.overrideOpacity = value;
        this.updateOpacityField();
        break;

      case "opacity":
        this.opacity = value;
        this.updateOpacityField();
        break;

      case "materialType":
        this.materialSelectBox.value = value;
        this.shaderRow.hidden = value !== "shader";
        break;

      case "shaderAssetId":
        this.shaderAssetId = value;
        this.shaderButtonElt.disabled = this.shaderAssetId == null;
        if (value != null) this.shaderTextField.value = this.projectClient.entries.getPathFromId(value);
        else this.shaderTextField.value = "";
        break;
    }
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.Data.Entries) {
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

  onEntryAdded(entry: any, parentId: string, index: number) { /* Ignore */ }
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
  onEntryTrashed(id: string) { /* Ignore */ }

  onAssetReceived(assetId: string, asset: any) {
    if (assetId !== this.spriteAssetId) return;
    this.asset = asset;

    this._clearAnimations();

    for (let animation of this.asset.pub.animations) {
      SupClient.table.appendSelectOption(this.animationSelectBox, animation.id, animation.name);
    }

    this.animationSelectBox.value = (this.animationId != null) ? this.animationId : "";
    this.animationSelectBox.disabled = false;

    this.updateOpacityField();
  }

  onAssetEdited(assetId: string, command: string, ...args: any[]) {
    if (assetId !== this.spriteAssetId) return;

    if (command === "setProperty" && args[0] === "opacity") this.updateOpacityField();

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
    this.asset = null;
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

  private updateOpacityField() {
    this.overrideOpacityField.checked = this.overrideOpacity;
    this.transparentField.disabled = !this.overrideOpacity;
    this.opacityFields.sliderField.disabled = !this.overrideOpacity;
    this.opacityFields.numberField.disabled = !this.overrideOpacity;

    if (!this.overrideOpacity && this.asset == null) {
      this.transparentField.value = "empty";
      this.opacityFields.numberField.parentElement.hidden = true;
    } else {
      let opacity = this.overrideOpacity ? this.opacity : this.asset.pub.opacity;
      if (opacity != null) {
        this.transparentField.value = "transparent";
        this.opacityFields.numberField.parentElement.hidden = false;
        this.opacityFields.sliderField.value = opacity.toString();
        this.opacityFields.numberField.value = opacity.toString();
      } else {
        this.transparentField.value = "opaque";
        this.opacityFields.numberField.parentElement.hidden = true;
      }
    }
  }

  private onChangeSpriteAsset = (event: any) => {
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
  };

  private onChangeSpriteAnimation = (event: any) => {
    let animationId = (event.target.value === "") ? null : event.target.value;
    this.editConfig("setProperty", "animationId", animationId);
  };

  private onChangeShaderAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "shaderAssetId", null);
    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "shader") this.editConfig("setProperty", "shaderAssetId", entry.id);
    }
  };
}
