export default class TileMapRendererEditor {
  projectClient: SupClient.ProjectClient;
  editConfig: any;
  tbody: HTMLTableSectionElement;

  tileMapAssetId: string;
  tileSetAssetId: string;
  shaderAssetId: string;

  tileMapTextField: HTMLInputElement;
  tileMapButtonElt: HTMLButtonElement;
  tileSetTextField: HTMLInputElement;
  castShadowField: HTMLInputElement;
  receiveShadowField: HTMLInputElement;
  materialSelectBox: HTMLSelectElement;
  shaderRow: HTMLTableRowElement;
  shaderTextField: HTMLInputElement;
  shaderButtonElt: HTMLButtonElement;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.tbody = tbody;

    this.tileMapAssetId = config.tileMapAssetId;
    this.tileSetAssetId = config.tileSetAssetId;
    this.shaderAssetId = config.shaderAssetId;

    let tileMapRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.tileMap"));
    let tileMapFields = SupClient.table.appendAssetField(tileMapRow.valueCell, "");
    this.tileMapTextField = tileMapFields.textField;
    this.tileMapTextField.disabled = true;
    this.tileMapButtonElt = tileMapFields.buttonElt;
    this.tileMapButtonElt.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.tileMapAssetId }, window.location.origin);
    });
    this.tileMapButtonElt.disabled = this.tileMapAssetId == null;

    let tileSetRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.tileSet"));
    this.tileSetTextField = SupClient.table.appendTextField(tileSetRow.valueCell, "");
    this.tileSetTextField.disabled = true;

    let shadowRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.shadow.title"));
    let shadowDiv = document.createElement("div") as HTMLDivElement;
    shadowDiv.classList.add("inputs");
    shadowRow.valueCell.appendChild(shadowDiv);

    let castSpan = document.createElement("span");
    castSpan.style.marginLeft = "5px";
    castSpan.textContent = SupClient.i18n.t("componentEditors:TileMapRenderer.shadow.cast");
    shadowDiv.appendChild(castSpan);
    this.castShadowField = SupClient.table.appendBooleanField(shadowDiv, config.castShadow);
    this.castShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "castShadow", event.target.checked);
    });
    this.castShadowField.disabled = true;

    let receiveSpan = document.createElement("span");
    receiveSpan.style.marginLeft = "5px";
    receiveSpan.textContent = SupClient.i18n.t("componentEditors:TileMapRenderer.shadow.receive");
    shadowDiv.appendChild(receiveSpan);
    this.receiveShadowField = SupClient.table.appendBooleanField(shadowDiv, config.receiveShadow);
    this.receiveShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "receiveShadow", event.target.checked);
    });
    this.receiveShadowField.disabled = true;

    let materialRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.material"));
    this.materialSelectBox = SupClient.table.appendSelectBox(materialRow.valueCell, { "basic": "Basic", "phong": "Phong", "shader": "Shader" }, config.materialType);
    this.materialSelectBox.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "materialType", event.target.value);
    });
    this.materialSelectBox.disabled = true;

    let shaderRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.shader"));
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

    this.tileMapTextField.addEventListener("input", this.onChangeTileMapAsset);
    this.tileSetTextField.addEventListener("input", this.onChangeTileSetAsset);

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
        if (this.tileMapAssetId != null) this.tileMapTextField.value = this.projectClient.entries.getPathFromId(this.tileMapAssetId);
        else this.tileMapTextField.value = "";
        break;
      case "tileSetAssetId":
        this.tileSetAssetId = value;
        if (this.tileSetAssetId != null) this.tileSetTextField.value = this.projectClient.entries.getPathFromId(this.tileSetAssetId);
        else this.tileSetTextField.value = "";
        break;

      case "castShadow":
        this.castShadowField.checked = value;
        break;

      case "receiveShadow":
        this.receiveShadowField.checked = value;
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
    this.tileMapTextField.disabled = false;
    this.materialSelectBox.disabled = false;
    this.castShadowField.disabled = false;
    this.receiveShadowField.disabled = false;
    this.shaderTextField.disabled = false;

    if (entries.byId[this.tileMapAssetId] != null)
      this.tileMapTextField.value = entries.getPathFromId(this.tileMapAssetId);

    if (entries.byId[this.shaderAssetId] != null) {
      this.shaderTextField.value = entries.getPathFromId(this.shaderAssetId);
    }
  }

  onEntryAdded(entry: any, parentId: string, index: number) { /* Nothing to do here */ }
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id === this.tileMapAssetId) this.tileMapTextField.value = this.projectClient.entries.getPathFromId(this.tileMapAssetId);
    if (id === this.tileSetAssetId) this.tileSetTextField.value = this.projectClient.entries.getPathFromId(this.tileSetAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id === this.tileMapAssetId) this.tileMapTextField.value = this.projectClient.entries.getPathFromId(this.tileMapAssetId);
    if (id === this.tileSetAssetId) this.tileSetTextField.value = this.projectClient.entries.getPathFromId(this.tileSetAssetId);
  }
  onEntryTrashed(id: string) { /* Nothing to do here */ }

  private onChangeTileMapAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "tileMapAssetId", null);

    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "tileMap") this.editConfig("setProperty", "tileMapAssetId", entry.id);
    }
  };

  private onChangeTileSetAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "tileSetAssetId", null);

    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "tileSet") this.editConfig("setProperty", "tileSetAssetId", entry.id);
    }
  };

  private onChangeShaderAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "shaderAssetId", null);
    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "shader") this.editConfig("setProperty", "shaderAssetId", entry.id);
    }
  };
}
