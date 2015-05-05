import { ConfigPub } from '../data/ArcadeBody2DConfig';

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
    let typeRow = SupClient.table.appendRow(this.tbody, "Type");
    this.typeField = SupClient.table.appendSelectBox(typeRow.valueCell, {
      "box": "Box",
      "tileMap": "Tile Map"
    });
    this.typeField.value = config.type.toString();
    this.typeField.addEventListener("change", (event) => {
      this.editConfig("setProperty", "type", (<HTMLInputElement>event.target).value);
    });

    // Box boxFields
    this.boxFields = {};

    let movableRow = SupClient.table.appendRow(this.tbody, "Movable");
    this.boxFields["movable"] = SupClient.table.appendBooleanField(movableRow.valueCell, config.movable);
    this.boxFields["movable"].addEventListener("click", (event: any) => {
      this.editConfig("setProperty", "movable", event.target.checked);
    });

    let widthRow = SupClient.table.appendRow(this.tbody, "Width");
    this.boxFields["width"] = SupClient.table.appendNumberField(widthRow.valueCell, config.width, 0);
    this.boxFields["width"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "width", parseFloat(event.target.value));
    });

    let heightRow = SupClient.table.appendRow(this.tbody, "Height");
    this.boxFields["height"] = SupClient.table.appendNumberField(heightRow.valueCell, config.height, 0);
    this.boxFields["height"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "height", parseFloat(event.target.value));
    });

    let offsetX = SupClient.table.appendRow(this.tbody, "Offset X");
    this.boxFields["offsetX"] = SupClient.table.appendNumberField(offsetX.valueCell, config.offsetX, 0);
    this.boxFields["offsetX"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetX", parseFloat(event.target.value));
    });

    let offsetY = SupClient.table.appendRow(this.tbody, "Offset Y");
    this.boxFields["offsetY"] = SupClient.table.appendNumberField(offsetY.valueCell, config.offsetY, 0);
    this.boxFields["offsetY"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetY", parseFloat(event.target.value));
    });

    // Tile Map boxFields
    this.tileMapFields = {};

    let tileMapRow = SupClient.table.appendRow(this.tbody, "Tile Map");
    let tileMapName = (config.tileMapAssetId != "") ? this.projectClient.entries.getPathFromId(config.tileMapAssetId) : "";
    this.tileMapFields["tileMapAssetId"] = SupClient.table.appendTextField(tileMapRow.valueCell, tileMapName);
    this.tileMapFields["tileMapAssetId"].addEventListener("input", (event: any) => {
      if (event.target.value === "") this.editConfig("setProperty", "tileMapAssetId", event.target.value);
      else {
        let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
        if (entry != null && entry.type == "tileMap") this.editConfig("setProperty", "tileMapAssetId", entry.id);
      }
    });

    let tileSetPropertyNameRow = SupClient.table.appendRow(this.tbody, "Tile Set Property");
    this.tileMapFields["tileSetPropertyName"] = SupClient.table.appendTextField(tileSetPropertyNameRow.valueCell, config.tileSetPropertyName);
    this.tileMapFields["tileSetPropertyName"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "tileSetPropertyName", event.target.value);
    });

    let layersIndexRow = SupClient.table.appendRow(this.tbody, "Layers");
    this.tileMapFields["layersIndex"] = SupClient.table.appendTextField(layersIndexRow.valueCell, config.layersIndex);
    this.tileMapFields["layersIndex"].addEventListener("change", (event: any) => {
      let layersIndex = (event.target.value !== "") ? event.target.value : null
      this.editConfig("setProperty", "layersIndex", layersIndex);
    });

    this.updateFields(true);
  }

  destroy() {}
  config_setProperty(path: string, value: any) {
    if (path === "type") {
      this.typeField.value = value;
      this.updateFields();

    } else if (path === "movable") this.boxFields["movable"].checked = value;
    else if (path === "tileMapAssetId") {
      let tileMapName = (value != "") ? this.projectClient.entries.getPathFromId(value) : "";
      this.tileMapFields["tileMapAssetId"].value = tileMapName;

    } else {
      if (this.boxFields[path] != null) this.boxFields[path].value = value;
      else this.tileMapFields[path].value = value;
    }
  }

  updateFields(onlyRemove = false) {
    if (this.typeField.value === "box") {
      for (let fieldName in this.tileMapFields) this.tbody.removeChild(this.tileMapFields[fieldName].parentElement.parentElement);
      if (onlyRemove) return;
      for (let fieldName in this.boxFields) this.tbody.appendChild(this.boxFields[fieldName].parentElement.parentElement);

    } else {
      for (let fieldName in this.boxFields) this.tbody.removeChild(this.boxFields[fieldName].parentElement.parentElement);
      if (onlyRemove) return;
      for (let fieldName in this.tileMapFields) this.tbody.appendChild(this.tileMapFields[fieldName].parentElement.parentElement);
    }
  }
}
