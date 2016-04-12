import GameSettingsResource from "../data/GameSettingsResource";

export default class GameSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: GameSettingsResource;

  startupSceneRow: SupClient.table.RowParts;
  fpsRow: SupClient.table.RowParts;
  ratioRow: SupClient.table.RowParts;
  customLayersRow: SupClient.table.RowParts;
  customLayers: string[];
  layerContainers: HTMLDivElement;

  fields: { [name: string]: HTMLInputElement } = {};
  sceneAssetId: string;
  sceneFieldSubscriber: SupClient.table.AssetFieldSubscriber;

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    this.startupSceneRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Game.startupScene"));
    this.sceneFieldSubscriber = SupClient.table.appendAssetField(this.startupSceneRow.valueCell, this.sceneAssetId, "scene", projectClient);
    this.sceneFieldSubscriber.on("select", (assetId: string) => {
      this.projectClient.editResource("gameSettings", "setProperty", "startupSceneId", assetId);
    });

    this.fpsRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Game.framesPerSecond"));
    this.fields["framesPerSecond"] = SupClient.table.appendNumberField(this.fpsRow.valueCell, "", { min: 1 });

    this.ratioRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Game.screenRatio"));
    let ratioContainer = document.createElement("div");
    ratioContainer.className = "";
    this.ratioRow.valueCell.appendChild(ratioContainer);

    [ this.fields["ratioNumerator"], this.fields["ratioDenominator"] ] = SupClient.table.appendNumberFields(this.ratioRow.valueCell, [ "", "" ] );
    this.fields["ratioNumerator"].placeholder = SupClient.i18n.t("settingsEditors:Game.width");
    this.fields["ratioDenominator"].placeholder = SupClient.i18n.t("settingsEditors:Game.height");

    this.customLayersRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Game.layers"));
    this.layerContainers = document.createElement("div");
    this.layerContainers.className = "list";
    this.customLayersRow.valueCell.appendChild(this.layerContainers);
    this.fields["defaultLayer"] = SupClient.table.appendTextField(this.layerContainers, "Default");
    this.fields["defaultLayer"].readOnly = true;

    for (let i = 0; i < GameSettingsResource.schema["customLayers"].maxLength; i++) {
      let field = this.fields[`customLayer${i}`] = SupClient.table.appendTextField(this.layerContainers, "");
      field.dataset["customLayerIndex"] = i.toString();
      field.addEventListener("change", this.onCustomLayerFieldChange);
    }

    this.fields["framesPerSecond"].addEventListener("change", (event: any) => {
      this.projectClient.editResource("gameSettings", "setProperty", "framesPerSecond", parseInt(event.target.value, 10));
    });

    this.fields["ratioNumerator"].addEventListener("change", (event: any) => {
      this.projectClient.editResource("gameSettings", "setProperty", "ratioNumerator", parseInt(event.target.value, 10));
    });

    this.fields["ratioDenominator"].addEventListener("change", (event: any) => {
      this.projectClient.editResource("gameSettings", "setProperty", "ratioDenominator", parseInt(event.target.value, 10));
    });

    this.projectClient.subResource("gameSettings", this);
  }

  _setStartupScene(id: string) {
    this.sceneAssetId = id;
    this.sceneFieldSubscriber.onChangeAssetId(id);
  }

  onResourceReceived = (resourceId: string, resource: GameSettingsResource) => {
    this.resource = resource;

    this._setupCustomLayers();

    for (let setting in resource.pub) {
      if (setting === "formatVersion" || setting === "customLayers") continue;

      if (setting === "startupSceneId") this._setStartupScene(resource.pub.startupSceneId);
      else this.fields[setting].value = resource.pub[setting];
    }
  };

  _setupCustomLayers() {
    this.customLayers = this.resource.pub.customLayers.slice(0);
    for (let i = 0; i < GameSettingsResource.schema["customLayers"].maxLength; i++) {
      let field = this.fields[`customLayer${i}`];
      if (i === this.customLayers.length) {
        field.placeholder = SupClient.i18n.t("settingsEditors:Game.newLayer");
        field.value = "";
      } else {
        field.placeholder = "";
      }

      if (i > this.customLayers.length) {
        if (field.parentElement != null) this.layerContainers.removeChild(field);
      } else {
        if (field.parentElement == null) this.layerContainers.appendChild(field);
        if (i < this.customLayers.length) field.value = this.customLayers[i];
      }
    }
  }

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    if (propertyName === "customLayers") this._setupCustomLayers();
    else if (propertyName === "startupSceneId") this._setStartupScene(this.resource.pub.startupSceneId);
    else this.fields[propertyName].value = this.resource.pub[propertyName];
  };

  onCustomLayerFieldChange = (event: any) => {
    let index = parseInt(event.target.dataset["customLayerIndex"], 10);
    if (index > this.customLayers.length) return;

    if (index === this.customLayers.length) {
      if (event.target.value === "") return;
      this.customLayers.push(event.target.value);

    } else {
      if (event.target.value === "") {
        if (index === this.customLayers.length - 1) {
          this.customLayers.pop();
        } else {
          /* tslint:disable:no-unused-expression */
          new SupClient.Dialogs.InfoDialog("Layer name cannot be empty");
          /* tslint:enable:no-unused-expression */
          event.target.value = this.customLayers[index];
          return;
        }
      } else {
        this.customLayers[index] = event.target.value;
      }
    }

    this.projectClient.editResource("gameSettings", "setProperty", "customLayers", this.customLayers);
  };
}
