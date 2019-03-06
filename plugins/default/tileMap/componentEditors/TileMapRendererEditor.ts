export default class TileMapRendererEditor {
  projectClient: SupClient.ProjectClient;
  editConfig: any;
  tbody: HTMLTableSectionElement;

  tileMapAssetId: string;
  tileSetAssetId: string;
  shaderAssetId: string;

  tileMapFieldSubscriber: SupClient.table.AssetFieldSubscriber;
  shaderFieldSubscriber: SupClient.table.AssetFieldSubscriber;

  tileSetTextField: HTMLInputElement;
  castShadowField: HTMLInputElement;
  receiveShadowField: HTMLInputElement;
  materialSelectBox: HTMLSelectElement;
  shaderRow: HTMLTableRowElement;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.tbody = tbody;

    this.tileMapAssetId = config.tileMapAssetId;
    this.tileSetAssetId = config.tileSetAssetId;
    this.shaderAssetId = config.shaderAssetId;

    const tileMapRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.tileMap"));
    this.tileMapFieldSubscriber = SupClient.table.appendAssetField(tileMapRow.valueCell, this.tileMapAssetId, "tileMap", projectClient);
    this.tileMapFieldSubscriber.on("select", (assetId: string) => {
      this.editConfig("setProperty", "tileMapAssetId", assetId);
    });

    const tileSetRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.tileSet"));
    this.tileSetTextField = SupClient.table.appendTextField(tileSetRow.valueCell, "");
    this.tileSetTextField.disabled = true;
    this.tileSetTextField.addEventListener("input", this.onChangeTileSetAsset);

    const shadowRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.shadow.title"));
    const shadowDiv = document.createElement("div") as HTMLDivElement;
    shadowDiv.classList.add("inputs");
    shadowRow.valueCell.appendChild(shadowDiv);

    const castSpan = document.createElement("span");
    castSpan.style.marginLeft = "5px";
    castSpan.textContent = SupClient.i18n.t("componentEditors:TileMapRenderer.shadow.cast");
    shadowDiv.appendChild(castSpan);
    this.castShadowField = SupClient.table.appendBooleanField(shadowDiv, config.castShadow);
    this.castShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "castShadow", event.target.checked);
    });

    const receiveSpan = document.createElement("span");
    receiveSpan.style.marginLeft = "5px";
    receiveSpan.textContent = SupClient.i18n.t("componentEditors:TileMapRenderer.shadow.receive");
    shadowDiv.appendChild(receiveSpan);
    this.receiveShadowField = SupClient.table.appendBooleanField(shadowDiv, config.receiveShadow);
    this.receiveShadowField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "receiveShadow", event.target.checked);
    });

    const materialRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.material"));
    this.materialSelectBox = SupClient.table.appendSelectBox(materialRow.valueCell, { "basic": "Basic", "phong": "Phong", "shader": "Shader" }, config.materialType);
    this.materialSelectBox.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "materialType", event.target.value);
    });

    const shaderRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TileMapRenderer.shader"));
    this.shaderRow = shaderRow.row;
    this.shaderFieldSubscriber = SupClient.table.appendAssetField(shaderRow.valueCell, this.shaderAssetId, "shader", projectClient);
    this.shaderFieldSubscriber.on("select", (assetId: string) => {
      this.editConfig("setProperty", "shaderAssetId", assetId);
    });
    this.shaderRow.hidden = config.materialType !== "shader";
  }

  destroy() {
    this.tileMapFieldSubscriber.destroy();
    this.shaderFieldSubscriber.destroy();
  }

  config_setProperty(path: string, value: any) {
    if (this.projectClient.entries == null) return;

    switch (path) {
      case "tileMapAssetId":
        this.tileMapAssetId = value;
        this.tileMapFieldSubscriber.onChangeAssetId(this.tileMapAssetId);
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
        this.shaderFieldSubscriber.onChangeAssetId(this.shaderAssetId);
        break;
    }
  }

  private onChangeTileSetAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "tileSetAssetId", null);

    else {
      const entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "tileSet") this.editConfig("setProperty", "tileSetAssetId", entry.id);
    }
  }
}
