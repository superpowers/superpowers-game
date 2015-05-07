import { LightConfigPub } from "../data/LightConfig";

export default class LightEditor {
  tbody: HTMLTableSectionElement
  editConfig: any;

  typeSelectBox: HTMLSelectElement;
  colorField: HTMLInputElement;
  intensityField: HTMLInputElement;
  distanceField: HTMLInputElement;
  targetFields: {
    x: HTMLInputElement;
    y: HTMLInputElement;
    z: HTMLInputElement;
  }

  constructor(tbody: HTMLTableSectionElement, config: LightConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.editConfig = editConfig;

    let typeRow = SupClient.table.appendRow(tbody, "Type");
    this.typeSelectBox = SupClient.table.appendSelectBox(typeRow.valueCell,
      { "ambient": "Ambient", "point": "Point", "spot": "Spot", "directional": "Directional" }, config.type);
    this.typeSelectBox.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "type", event.target.value);
    });

    let colorRow = SupClient.table.appendRow(tbody, "Color");
    this.colorField = SupClient.table.appendTextField(colorRow.valueCell, config.color);
    this.colorField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color", event.target.value);
    });

    let intensityRow = SupClient.table.appendRow(tbody, "Intensity");
    this.intensityField = SupClient.table.appendNumberField(intensityRow.valueCell, config.intensity, 0);
    this.intensityField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "intensity", parseFloat(event.target.value));
    });

    let distanceRow = SupClient.table.appendRow(tbody, "Distance");
    this.distanceField = SupClient.table.appendNumberField(distanceRow.valueCell, config.distance, 0);
    this.distanceField.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "distance", parseFloat(event.target.value));
    });

    let targetRow = SupClient.table.appendRow(tbody, "Target");
    this.targetFields = SupClient.table.appendVectorFields(targetRow.valueCell, config.target)
    this.targetFields.x.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "target.x", parseFloat(event.target.value));
    });
    this.targetFields.y.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "target.y", parseFloat(event.target.value));
    });
    this.targetFields.z.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "target.z", parseFloat(event.target.value));
    });

    this.updateFields();
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    switch(path) {
      case "type":
        this.typeSelectBox.value = value;
        this.updateFields();
        break;
      case "color":
        this.colorField.value = value;
        break;
      case "intensity":
        this.intensityField.value = value;
        break;
      case "distance":
        this.distanceField.value = value;
        break;
      case "target.x":
        this.targetFields.x.value = value;
        break;
      case "target.y":
        this.targetFields.y.value = value;
        break;
      case "target.z":
        this.targetFields.z.value = value;
        break;
    }
  }

  updateFields() {
    if (this.typeSelectBox.value === "ambient") {
      let intensityRow = this.intensityField.parentElement.parentElement;
      if (intensityRow.parentElement != null) intensityRow.parentElement.removeChild(intensityRow);

      let distanceRow = this.distanceField.parentElement.parentElement;
      if (distanceRow.parentElement != null) distanceRow.parentElement.removeChild(distanceRow);

      let targetRow = this.targetFields.x.parentElement.parentElement.parentElement;
      if (targetRow.parentElement != null) targetRow.parentElement.removeChild(targetRow);
    }
    else {
      let intensityRow = this.intensityField.parentElement.parentElement;
      if (intensityRow.parentElement == null) this.tbody.appendChild(intensityRow);

      let distanceRow = this.distanceField.parentElement.parentElement;
      if (this.typeSelectBox.value === "directional") {
        if (distanceRow.parentElement != null) distanceRow.parentElement.removeChild(distanceRow);
      } else if (distanceRow.parentElement == null) this.tbody.appendChild(distanceRow);

      let targetRow = this.targetFields.x.parentElement.parentElement.parentElement;
      if (this.typeSelectBox.value === "spot" || this.typeSelectBox.value === "directional") {
        if (targetRow.parentElement == null) this.tbody.appendChild(targetRow);
      } else if (targetRow.parentElement != null) targetRow.parentElement.removeChild(targetRow);
    }
  }
}
