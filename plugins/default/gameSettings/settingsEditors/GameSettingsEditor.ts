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
  startupSceneButton: HTMLButtonElement;

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    this.startupSceneRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Game.startupScene"));
    let startupSceneFields = SupClient.table.appendAssetField(this.startupSceneRow.valueCell, "");
    this.fields["startupSceneId"] = startupSceneFields.textField;
    this.startupSceneButton = startupSceneFields.buttonElt;
    this.startupSceneButton.disabled = true;

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

    this.fields["startupSceneId"].addEventListener("input", (event: any) => {
      if (event.target.value === "") this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "startupSceneId", null, (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
      else {
        let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
        if (entry != null && entry.type === "scene")
          this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "startupSceneId", entry.id, (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
      }
    });
    this.startupSceneButton.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.sceneAssetId }, window.location.origin);
    });

    this.fields["framesPerSecond"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "framesPerSecond", parseInt(event.target.value, 10), (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
    });

    this.fields["ratioNumerator"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "ratioNumerator", parseInt(event.target.value, 10), (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
    });

    this.fields["ratioDenominator"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "ratioDenominator", parseInt(event.target.value, 10), (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
    });

    this.projectClient.subEntries(this);
    this.projectClient.subResource("gameSettings", this);
  }

  _setStartupScene(id: string) {
    let entry = this.projectClient.entries.byId[id];
    if (entry != null && entry.type === "scene") {
      this.sceneAssetId = id;
      this.fields["startupSceneId"].value = this.projectClient.entries.getPathFromId(id);
      this.startupSceneButton.disabled = false;
    } else {
      this.sceneAssetId = null;
      this.fields["startupSceneId"].value = "";
      this.startupSceneButton.disabled = true;
    }
  }

  onEntriesReceived = (entries: SupCore.Data.Entries) => {
    if (this.resource == null) return;
    this._setStartupScene(this.resource.pub.startupSceneId);
  };

  onEntryAdded() { /* Nothing to do here */ }
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id !== this.resource.pub.startupSceneId) return;
    this._setStartupScene(id);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id !== this.resource.pub.startupSceneId) return;
    this._setStartupScene(id);
  }
  onEntryTrashed(id: string) {
    if (id !== this.resource.pub.startupSceneId) return;
    this._setStartupScene(id);
  }

  onResourceReceived = (resourceId: string, resource: GameSettingsResource) => {
    this.resource = resource;

    this._setupCustomLayers();

    for (let setting in resource.pub) {
      if (setting === "formatVersion" || setting === "customLayers") continue;

      if (setting === "startupSceneId") {
        if (this.projectClient.entries != null) this._setStartupScene(resource.pub.startupSceneId);
      } else this.fields[setting].value = resource.pub[setting];
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
    let index = parseInt(<string>event.target.dataset.customLayerIndex, 10);
    if (index > this.customLayers.length) return;

    if (index === this.customLayers.length) {
      if (event.target.value === "") return;
      this.customLayers.push(event.target.value);

    } else {
      if (event.target.value === "") {
        if (index === this.customLayers.length - 1) {
          this.customLayers.pop();
        } else {
          new SupClient.dialogs.InfoDialog("Layer name cannot be empty", SupClient.i18n.t("common:actions.close"));
          event.target.value = this.customLayers[index];
          return;
        }
      } else {
        this.customLayers[index] = event.target.value;
      }
    }

    this.projectClient.socket.emit("edit:resources", "gameSettings", "setProperty", "customLayers", this.customLayers, (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
  };
}
