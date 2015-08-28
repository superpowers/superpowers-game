import { LightConfigPub } from "../data/LightConfig";

export default class LightEditor {
  tbody: HTMLTableSectionElement
  editConfig: any;
  castShadow: boolean;

  fields: { [name: string]: HTMLInputElement; } = {};
  shadowRows: HTMLTableRowElement[] = [];
  colorPicker: HTMLInputElement;

  constructor(tbody: HTMLTableSectionElement, config: LightConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.editConfig = editConfig;
    this.castShadow = config.castShadow;

    let typeRow = SupClient.table.appendRow(tbody, "Type");
    this.fields["type"] = <any>SupClient.table.appendSelectBox(typeRow.valueCell,
      { "ambient": "Ambient", "point": "Point", "spot": "Spot", "directional": "Directional" }, config.type);
    this.fields["type"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "type", event.target.value);
    });

    let colorRow = SupClient.table.appendRow(tbody, "Color");
    let colorInputs = SupClient.table.appendColorField(colorRow.valueCell, config.color);

    this.fields["color"] = colorInputs.textField;
    this.fields["color"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color", event.target.value);
    });

    this.colorPicker = colorInputs.pickerField;
    this.colorPicker.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color", event.target.value.slice(1));
    });

    let intensityRow = SupClient.table.appendRow(tbody, "Intensity");
    this.fields["intensity"] = SupClient.table.appendNumberField(intensityRow.valueCell, config.intensity, 0);
    this.fields["intensity"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "intensity", parseFloat(event.target.value));
    });

    let distanceRow = SupClient.table.appendRow(tbody, "Distance");
    this.fields["distance"] = SupClient.table.appendNumberField(distanceRow.valueCell, config.distance, 0);
    this.fields["distance"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "distance", parseFloat(event.target.value));
    });

    let angleRow = SupClient.table.appendRow(tbody, "Angle");
    this.fields["angle"] = SupClient.table.appendNumberField(angleRow.valueCell, config.angle, 0, 90);
    this.fields["angle"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "angle", parseFloat(event.target.value));
    });

    let targetRow = SupClient.table.appendRow(tbody, "Target");
    let targetFields = SupClient.table.appendNumberFields(targetRow.valueCell, [config.target.x, config.target.y, config.target.z]);
    this.fields["target.x"] = targetFields[0];
    this.fields["target.x"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "target.x", parseFloat(event.target.value));
    });
    this.fields["target.y"] = targetFields[1];
    this.fields["target.y"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "target.y", parseFloat(event.target.value));
    });
    this.fields["target.z"] = targetFields[2];
    this.fields["target.z"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "target.z", parseFloat(event.target.value));
    });

    let castShadowRow = SupClient.table.appendRow(tbody, "Cast Shadow");
    this.fields["castShadow"] = SupClient.table.appendBooleanField(castShadowRow.valueCell, config.castShadow);
    this.fields["castShadow"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "castShadow", event.target.checked);
    });

    let shadowHeaderRow = SupClient.table.appendHeader(tbody, "Shadow Settings");
    this.shadowRows.push(shadowHeaderRow);

    let shadowMapSizeRow = SupClient.table.appendRow(tbody, "Map Size");
    let shadowMapFields = SupClient.table.appendNumberFields(shadowMapSizeRow.valueCell, [config.shadowMapSize.width, config.shadowMapSize.height], 1);
    this.fields["shadowMapSize.width"] = shadowMapFields[0];
    this.fields["shadowMapSize.width"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowMapSize.width", parseFloat(event.target.value));
    });
    this.fields["shadowMapSize.height"] = shadowMapFields[1];
    this.fields["shadowMapSize.height"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowMapSize.height", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowMapSizeRow.row);

    let shadowBiasRow = SupClient.table.appendRow(tbody, "Bias");
    this.fields["shadowBias"] = SupClient.table.appendNumberField(shadowBiasRow.valueCell, config.shadowBias);
    this.fields["shadowBias"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowBias", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowBiasRow.row);

    let shadowDarknessRow = SupClient.table.appendRow(tbody, "Darkness");
    this.fields["shadowDarkness"] = SupClient.table.appendNumberField(shadowDarknessRow.valueCell, config.shadowDarkness, 0, 1);
    this.fields["shadowDarkness"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowDarkness", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowDarknessRow.row);

    let shadowPlanesRow = SupClient.table.appendRow(tbody, "Near / Far");
    let shadowPlanesFields = SupClient.table.appendNumberFields(shadowPlanesRow.valueCell, [config.shadowCameraNearPlane, config.shadowCameraFarPlane], 0);
    this.fields["shadowCameraNearPlane"] = shadowPlanesFields[0];
    this.fields["shadowCameraNearPlane"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraNearPlane", parseFloat(event.target.value));
    });
    this.fields["shadowCameraFarPlane"] = shadowPlanesFields[1];
    this.fields["shadowCameraFarPlane"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraFarPlane", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowPlanesRow.row);

    let shadowCameraFovRow = SupClient.table.appendRow(tbody, "Fov");
    this.fields["shadowCameraFov"] = SupClient.table.appendNumberField(shadowCameraFovRow.valueCell, config.shadowCameraFov);
    this.fields["shadowCameraFov"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraFov", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowCameraFovRow.row);

    let shadowCameraTopBottomRow = SupClient.table.appendRow(tbody, "Top / Bottom");
    let shadowCameraTopBottomFields = SupClient.table.appendNumberFields(shadowCameraTopBottomRow.valueCell, [config.shadowCameraSize.top, config.shadowCameraSize.bottom]);
    this.fields["shadowCameraSize.top"] = shadowCameraTopBottomFields[0];
    this.fields["shadowCameraSize.top"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraSize.top", parseFloat(event.target.value));
    });
    this.fields["shadowCameraSize.bottom"] = shadowCameraTopBottomFields[1];
    this.fields["shadowCameraSize.bottom"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraSize.bottom", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowCameraTopBottomRow.row);

    let shadowCameraLeftRightRow = SupClient.table.appendRow(tbody, "Left / Right");
    let shadowCameraLeftRightFields = SupClient.table.appendNumberFields(shadowCameraLeftRightRow.valueCell, [config.shadowCameraSize.left, config.shadowCameraSize.right]);
    this.fields["shadowCameraSize.left"] = shadowCameraLeftRightFields[0];
    this.fields["shadowCameraSize.left"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraSize.left", parseFloat(event.target.value));
    });
    this.fields["shadowCameraSize.right"] = shadowCameraLeftRightFields[1];
    this.fields["shadowCameraSize.right"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraSize.right", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowCameraLeftRightRow.row);

    this.updateFields();
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    if (path === "castShadow") {
      this.fields[path].checked = value;
      this.castShadow = value;
      this.updateFields();
    } else this.fields[path].value = value;

    if (path === "type") this.updateFields();
    if (path === "color") this.colorPicker.value = `#${value}`;
  }

  updateFields() {
    if (this.fields["type"].value === "ambient") {
      let intensityRow = this.fields["intensity"].parentElement.parentElement;
      if (intensityRow.parentElement != null) intensityRow.parentElement.removeChild(intensityRow);

      let distanceRow = this.fields["distance"].parentElement.parentElement;
      if (distanceRow.parentElement != null) distanceRow.parentElement.removeChild(distanceRow);

      let angleRow = this.fields["angle"].parentElement.parentElement;
      if (angleRow.parentElement != null) angleRow.parentElement.removeChild(angleRow);

      let targetRow = this.fields["target.x"].parentElement.parentElement.parentElement;
      if (targetRow.parentElement != null) targetRow.parentElement.removeChild(targetRow);

      let castShadowRow = this.fields["castShadow"].parentElement.parentElement;
      if (castShadowRow.parentElement != null) castShadowRow.parentElement.removeChild(castShadowRow);
    }
    else {
      let intensityRow = this.fields["intensity"].parentElement.parentElement;
      if (intensityRow.parentElement == null) this.tbody.appendChild(intensityRow);

      let castShadowRow = this.fields["castShadow"].parentElement.parentElement;
      if (castShadowRow.parentElement != null) castShadowRow.parentElement.removeChild(castShadowRow);
      for (let shadowRow of this.shadowRows)
        if (shadowRow.parentElement != null) shadowRow.parentElement.removeChild(shadowRow);

      let distanceRow = this.fields["distance"].parentElement.parentElement;
      if (this.fields["type"].value === "directional") {
        if (distanceRow.parentElement != null) distanceRow.parentElement.removeChild(distanceRow);
      } else if (distanceRow.parentElement == null) this.tbody.appendChild(distanceRow);

      let angleRow = this.fields["angle"].parentElement.parentElement;
      if (this.fields["type"].value === "spot") {
        if (angleRow.parentElement == null) this.tbody.appendChild(angleRow);
      } else if (angleRow.parentElement != null) angleRow.parentElement.removeChild(angleRow);

      let targetRow = this.fields["target.x"].parentElement.parentElement.parentElement;

      if (this.fields["type"].value === "spot" || this.fields["type"].value === "directional") {
        if (targetRow.parentElement == null) this.tbody.appendChild(targetRow);

        if (castShadowRow.parentElement == null) this.tbody.appendChild(castShadowRow);

        if (this.castShadow) {
          for (let shadowRow of this.shadowRows)
            if (shadowRow.parentElement == null) this.tbody.appendChild(shadowRow);
          if (this.fields["type"].value === "spot") {
            let topBottomRow = this.fields["shadowCameraSize.top"].parentElement.parentElement.parentElement;
            topBottomRow.parentElement.removeChild(topBottomRow);
            let leftRightRow = this.fields["shadowCameraSize.left"].parentElement.parentElement.parentElement;
            leftRightRow.parentElement.removeChild(leftRightRow);
          } else {
            let fovRow = this.fields["shadowCameraFov"].parentElement.parentElement;
            fovRow.parentElement.removeChild(fovRow);
          }
        }

      } else {
        if (targetRow.parentElement != null) targetRow.parentElement.removeChild(targetRow);
      }
    }
  }
}
