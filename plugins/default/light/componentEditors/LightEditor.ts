import { LightConfigPub } from "../componentConfigs/LightConfig";

export default class LightEditor {
  tbody: HTMLTableSectionElement;
  editConfig: any;
  castShadow: boolean;

  fields: { [name: string]: HTMLInputElement; } = {};
  colorField: SupClient.table.ColorField;
  shadowRows: HTMLTableRowElement[] = [];

  constructor(tbody: HTMLTableSectionElement, config: LightConfigPub, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.editConfig = editConfig;
    this.castShadow = config.castShadow;

    let typeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.type"));
    let typeOptions: { [key: string]: string } = {
      "ambient": SupClient.i18n.t("componentEditors:Light.typeOptions.ambient"),
      "point": SupClient.i18n.t("componentEditors:Light.typeOptions.point"),
      "spot": SupClient.i18n.t("componentEditors:Light.typeOptions.spot"),
      "directional": SupClient.i18n.t("componentEditors:Light.typeOptions.directional")
    };
    this.fields["type"] = <any>SupClient.table.appendSelectBox(typeRow.valueCell, typeOptions, config.type);
    this.fields["type"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "type", event.target.value);
    });

    let colorRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.color"));
    this.colorField = SupClient.table.appendColorField(colorRow.valueCell, config.color);
    this.colorField.addListener("change", (color: string) => {
      this.editConfig("setProperty", "color", color);
    });

    let intensityRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.intensity"));
    this.fields["intensity"] = SupClient.table.appendNumberField(intensityRow.valueCell, config.intensity, { min: 0 });
    this.fields["intensity"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "intensity", parseFloat(event.target.value));
    });

    let distanceRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.distance"));
    this.fields["distance"] = SupClient.table.appendNumberField(distanceRow.valueCell, config.distance, { min: 0 });
    this.fields["distance"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "distance", parseFloat(event.target.value));
    });

    let angleRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.angle"));
    this.fields["angle"] = SupClient.table.appendNumberField(angleRow.valueCell, config.angle, { min: 0, max: 90 });
    this.fields["angle"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "angle", parseFloat(event.target.value));
    });

    let targetRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.target"));
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

    let castShadowRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.castShadow"));
    this.fields["castShadow"] = SupClient.table.appendBooleanField(castShadowRow.valueCell, config.castShadow);
    this.fields["castShadow"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "castShadow", event.target.checked);
    });

    let shadowHeaderRow = SupClient.table.appendHeader(tbody, SupClient.i18n.t("componentEditors:Light.shadowSettings.title"));
    this.shadowRows.push(shadowHeaderRow);

    let shadowMapSizeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.shadowSettings.mapSize"));
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

    let shadowBiasRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.shadowSettings.bias"));
    this.fields["shadowBias"] = SupClient.table.appendNumberField(shadowBiasRow.valueCell, config.shadowBias);
    this.fields["shadowBias"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowBias", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowBiasRow.row);

    let shadowDarknessRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.shadowSettings.darkness"));
    this.fields["shadowDarkness"] = SupClient.table.appendNumberField(shadowDarknessRow.valueCell, config.shadowDarkness, { min: 0, max: 1 });
    this.fields["shadowDarkness"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowDarkness", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowDarknessRow.row);

    let shadowPlanesRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.shadowSettings.near-far"));
    let shadowPlanesFields = SupClient.table.appendNumberFields(shadowPlanesRow.valueCell, [config.shadowCameraNearPlane, config.shadowCameraFarPlane], { min: 0 });
    this.fields["shadowCameraNearPlane"] = shadowPlanesFields[0];
    this.fields["shadowCameraNearPlane"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraNearPlane", parseFloat(event.target.value));
    });
    this.fields["shadowCameraFarPlane"] = shadowPlanesFields[1];
    this.fields["shadowCameraFarPlane"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraFarPlane", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowPlanesRow.row);

    let shadowCameraFovRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.shadowSettings.fov"));
    this.fields["shadowCameraFov"] = SupClient.table.appendNumberField(shadowCameraFovRow.valueCell, config.shadowCameraFov);
    this.fields["shadowCameraFov"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shadowCameraFov", parseFloat(event.target.value));
    });
    this.shadowRows.push(shadowCameraFovRow.row);

    let shadowCameraTopBottomRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.shadowSettings.top-bottom"));
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

    let shadowCameraLeftRightRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:Light.shadowSettings.left-right"));
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

  destroy() { /* Nothing to do here */ }

  config_setProperty(path: string, value: any) {
    if (path === "castShadow") {
      this.fields[path].checked = value;
      this.castShadow = value;
      this.updateFields();
    } else if (path === "color") {
      this.colorField.setValue(value);
    } else this.fields[path].value = value;

    if (path === "type") this.updateFields();
  }

  updateFields() {
    let type = this.fields["type"].value;

    let intensityRow = this.fields["intensity"].parentElement.parentElement;
    let distanceRow = this.fields["distance"].parentElement.parentElement;
    let angleRow = this.fields["angle"].parentElement.parentElement;
    let targetRow = this.fields["target.x"].parentElement.parentElement.parentElement;
    let castShadowRow = this.fields["castShadow"].parentElement.parentElement;

    if (type === "ambient") {
      intensityRow.hidden = true;
      distanceRow.hidden = true;
      angleRow.hidden = true;
      targetRow.hidden = true;
      castShadowRow.hidden = true;
      for (let shadowRow of this.shadowRows) shadowRow.hidden = true;
    }
    else {
      intensityRow.hidden = false;
      distanceRow.hidden = type === "directional";
      angleRow.hidden = type !== "spot";

      if (type === "spot" || type === "directional") {
        targetRow.hidden = false;
        castShadowRow.hidden = false;

        if (this.castShadow) {
          for (let shadowRow of this.shadowRows) shadowRow.hidden = false;
          if (type === "spot") {
            this.fields["shadowCameraSize.top"].parentElement.parentElement.parentElement.hidden = true;
            this.fields["shadowCameraSize.left"].parentElement.parentElement.parentElement.hidden = true;
          } else {
            this.fields["shadowCameraFov"].parentElement.parentElement.hidden = true;
          }
        } else {
          for (let shadowRow of this.shadowRows) shadowRow.hidden = true;
        }

      } else {
        targetRow.hidden = true;
        castShadowRow.hidden = true;
        for (let shadowRow of this.shadowRows) shadowRow.hidden = true;
      }
    }
  }
}
