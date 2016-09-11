import { ModelRendererConfigPub } from "../componentConfigs/ModelRendererConfig";
import ModelAsset from "../data/ModelAsset";

export default class ModelRendererEditor {
  tbody: HTMLTableSectionElement;
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  modelAssetId: string;
  animationId: string;
  shaderAssetId: string;

  modelFieldSubscriber: SupClient.table.AssetFieldSubscriber;
  shaderFieldSubscriber: SupClient.table.AssetFieldSubscriber;

  animationSelectBox: HTMLSelectElement;
  castShadowField: HTMLInputElement;
  receiveShadowField: HTMLInputElement;

  colorField: SupClient.table.ColorField;

  overrideOpacityField: HTMLInputElement;
  transparentField: HTMLSelectElement;
  opacityFields: { sliderField: HTMLInputElement; numberField: HTMLInputElement; };

  materialSelectBox: HTMLSelectElement;
  shaderRow: HTMLTableRowElement;

  asset: ModelAsset;
  overrideOpacity: boolean;
  opacity: number;

  constructor(tbody: HTMLTableSectionElement, config: ModelRendererConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.modelAssetId = config.modelAssetId;
    this.animationId = config.animationId;
    this.shaderAssetId = config.shaderAssetId;

    this.overrideOpacity = config.overrideOpacity;
    this.opacity = config.opacity;

    let modelRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:ModelRenderer.model"));
    this.modelFieldSubscriber = SupClient.table.appendAssetField(modelRow.valueCell, this.modelAssetId, "model", projectClient);
    this.modelFieldSubscriber.on("select", (assetId: string) => {
      this.editConfig("setProperty", "modelAssetId", assetId);
      this.editConfig("setProperty", "animationId", null);
    });

    let animationRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:ModelRenderer.animation"));
    this.animationSelectBox = SupClient.table.appendSelectBox(animationRow.valueCell, { "": SupClient.i18n.t("common:none") });
    this.animationSelectBox.addEventListener("change", (event: any) => {
      let animationId = (event.target.value === "") ? null : event.target.value;
      this.editConfig("setProperty", "animationId", animationId);
    });
    this.animationSelectBox.disabled = true;

    let shadowRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:ModelRenderer.shadow.title"));
    let shadowDiv = document.createElement("div") as HTMLDivElement;
    shadowDiv.classList.add("inputs");
    shadowRow.valueCell.appendChild(shadowDiv);

    let castSpan = document.createElement("span");
    castSpan.style.marginLeft = "5px";
    castSpan.textContent = SupClient.i18n.t("componentEditors:ModelRenderer.shadow.cast");
    shadowDiv.appendChild(castSpan);
    this.castShadowField = SupClient.table.appendBooleanField(shadowDiv, config.castShadow);
    this.castShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "castShadow", event.target.checked);
    });

    let receiveSpan = document.createElement("span");
    receiveSpan.style.marginLeft = "5px";
    receiveSpan.textContent = SupClient.i18n.t("componentEditors:ModelRenderer.shadow.receive");
    shadowDiv.appendChild(receiveSpan);
    this.receiveShadowField = SupClient.table.appendBooleanField(shadowDiv, config.receiveShadow);
    this.receiveShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "receiveShadow", event.target.checked);
    });

    let colorRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:ModelRenderer.color"));
    this.colorField = SupClient.table.appendColorField(colorRow.valueCell, config.color);
    this.colorField.addListener("change", (color: string) => {
      this.editConfig("setProperty", "color", color);
    });

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

    let materialRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:ModelRenderer.material"));
    this.materialSelectBox = SupClient.table.appendSelectBox(materialRow.valueCell, { "basic": "Basic", "phong": "Phong", "shader": "Shader" }, config.materialType);
    this.materialSelectBox.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "materialType", event.target.value);
    });

    let shaderRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:ModelRenderer.shader"));
    this.shaderRow = shaderRow.row;
    this.shaderFieldSubscriber = SupClient.table.appendAssetField(shaderRow.valueCell, this.shaderAssetId, "shader", this.projectClient);
    this.shaderFieldSubscriber.on("select", (assetId: string) => {
      this.editConfig("setProperty", "shaderAssetId", assetId);
    });
    this.shaderRow.hidden = config.materialType !== "shader";

    if (this.modelAssetId != null) this.projectClient.subAsset(this.modelAssetId, "model", this);
  }

  destroy() {
    this.modelFieldSubscriber.destroy();
    this.shaderFieldSubscriber.destroy();

    if (this.modelAssetId != null) this.projectClient.unsubAsset(this.modelAssetId, this);
  }

  config_setProperty(path: string, value: any) {
    if (this.projectClient.entries == null) return;

    switch(path) {
      case "modelAssetId":
        if (this.modelAssetId != null) {
          this.projectClient.unsubAsset(this.modelAssetId, this);
          this.asset = null;
        }
        this.modelAssetId = value;
        this.animationSelectBox.disabled = true;

        if (this.modelAssetId != null) this.projectClient.subAsset(this.modelAssetId, "model", this);
        this.modelFieldSubscriber.onChangeAssetId(this.modelAssetId);
        break;

      case "animationId":
        if (!this.animationSelectBox.disabled) {
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
        this.colorField.setValue(value);
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
        this.shaderFieldSubscriber.onChangeAssetId(this.shaderAssetId);
        break;
    }
  }

  // Network callbacks
  onAssetReceived(assetId: string, asset: any) {
    if (assetId !== this.modelAssetId) return;
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
    if (assetId !== this.modelAssetId) return;

    if (command === "setProperty" && args[0] === "opacity") this.updateOpacityField();

    if (command.indexOf("Animation") !== -1) return;
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
}
