import { ConfigPub } from "../componentConfigs/ArcadeBody2DConfig";

export default class ArcadeBody2DEditor {
  tbody: HTMLTableSectionElement;
  typeField: HTMLSelectElement;
  boxFields: { [name: string]: HTMLInputElement };
  tileMapFields: { [name: string]: HTMLInputElement };

  projectClient: SupClient.ProjectClient;
  editConfig: any;

  constructor(tbody: HTMLTableSectionElement, config: ConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    // Type
    const typeRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:ArcadeBody2D.type"));
    this.typeField = SupClient.table.appendSelectBox(typeRow.valueCell, {
      "box": SupClient.i18n.t("componentEditors:ArcadeBody2D.typeOptions.box"),
      "tileMap": SupClient.i18n.t("componentEditors:ArcadeBody2D.typeOptions.tileMap")
    });
    this.typeField.value = config.type.toString();
    this.typeField.addEventListener("change", (event) => {
      this.editConfig("setProperty", "type", (<HTMLInputElement>event.target).value);
    });

    // Box boxFields
    this.boxFields = {};

    const movableRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:ArcadeBody2D.movable"));
    this.boxFields["movable"] = SupClient.table.appendBooleanField(movableRow.valueCell, config.movable);
    this.boxFields["movable"].addEventListener("click", (event: any) => {
      this.editConfig("setProperty", "movable", event.target.checked);
    });

    const sizeRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:ArcadeBody2D.size"));
    const sizeFields = SupClient.table.appendNumberFields(sizeRow.valueCell, [config.width, config.height]);
    this.boxFields["width"] = sizeFields[0];
    this.boxFields["width"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "width", parseFloat(event.target.value));
    });
    this.boxFields["height"] = sizeFields[1];
    this.boxFields["height"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "height", parseFloat(event.target.value));
    });

    const offsetRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:ArcadeBody2D.offset"));
    const offsetFields = SupClient.table.appendNumberFields(offsetRow.valueCell, [config.offset.x, config.offset.y]);
    this.boxFields["offset.x"] = offsetFields[0];
    this.boxFields["offset.x"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offset.x", parseFloat(event.target.value));
    });

    this.boxFields["offset.y"] = offsetFields[1];
    this.boxFields["offset.y"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offset.y", parseFloat(event.target.value));
    });

    const bounceRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:ArcadeBody2D.bounce"));
    const bounceFields = SupClient.table.appendNumberFields(bounceRow.valueCell, [config.bounce.x, config.bounce.y]);
    this.boxFields["bounce.x"] = bounceFields[0];
    this.boxFields["bounce.x"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "bounce.x", parseFloat(event.target.value));
    });

    this.boxFields["bounce.y"] = bounceFields[1];
    this.boxFields["bounce.y"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "bounce.y", parseFloat(event.target.value));
    });

    // Tile Map boxFields
    this.tileMapFields = {};

    const tileMapRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:ArcadeBody2D.tileMap"));
    const tileMapName = (this.projectClient.entries.byId[config.tileMapAssetId] != null) ? this.projectClient.entries.getPathFromId(config.tileMapAssetId) : "";
    this.tileMapFields["tileMapAssetId"] = SupClient.table.appendTextField(tileMapRow.valueCell, tileMapName);
    this.tileMapFields["tileMapAssetId"].addEventListener("input", (event: any) => {
      if (event.target.value === "") this.editConfig("setProperty", "tileMapAssetId", null);
      else {
        const entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
        if (entry != null && entry.type === "tileMap") this.editConfig("setProperty", "tileMapAssetId", entry.id);
      }
    });

    const tileSetPropertyNameRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:ArcadeBody2D.tileSetProperty"));
    this.tileMapFields["tileSetPropertyName"] = SupClient.table.appendTextField(tileSetPropertyNameRow.valueCell, config.tileSetPropertyName);
    this.tileMapFields["tileSetPropertyName"].addEventListener("change", (event: any) => {
      const tileSetPropertyName = (event.target.value !== "") ? event.target.value : null;
      this.editConfig("setProperty", "tileSetPropertyName", tileSetPropertyName);
    });

    const layersIndexRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:ArcadeBody2D.layers"));
    this.tileMapFields["layersIndex"] = SupClient.table.appendTextField(layersIndexRow.valueCell, config.layersIndex);
    this.tileMapFields["layersIndex"].addEventListener("change", (event: any) => {
      const layersIndex = (event.target.value !== "") ? event.target.value : null;
      this.editConfig("setProperty", "layersIndex", layersIndex);
    });

    this.updateFields();
  }

  destroy() { /* Nothing to do here */ }
  config_setProperty(path: string, value: any) {
    if (path === "type") {
      this.typeField.value = value;
      this.updateFields();

    } else if (path === "movable") this.boxFields["movable"].checked = value;
    else if (path === "tileMapAssetId") {
      const tileMapName = (value !== null) ? this.projectClient.entries.getPathFromId(value) : "";
      this.tileMapFields["tileMapAssetId"].value = tileMapName;

    } else {
      if (this.boxFields[path] != null) this.boxFields[path].value = value;
      else this.tileMapFields[path].value = value;
    }
  }

  updateFields() {
    if (this.typeField.value === "box") {
      for (const fieldName in this.tileMapFields) this.tileMapFields[fieldName].parentElement.parentElement.hidden = true;

      this.boxFields["movable"].parentElement.parentElement.hidden = false;
      this.boxFields["width"].parentElement.parentElement.parentElement.hidden = false;
      this.boxFields["offset.x"].parentElement.parentElement.parentElement.hidden = false;
      this.boxFields["bounce.x"].parentElement.parentElement.parentElement.hidden = false;

    } else {
      for (const fieldName in this.tileMapFields) this.tileMapFields[fieldName].parentElement.parentElement.hidden = false;

      this.boxFields["movable"].parentElement.parentElement.hidden = true;
      this.boxFields["width"].parentElement.parentElement.parentElement.hidden = true;
      this.boxFields["offset.x"].parentElement.parentElement.parentElement.hidden = true;
      this.boxFields["bounce.x"].parentElement.parentElement.parentElement.hidden = true;
    }
  }
}
