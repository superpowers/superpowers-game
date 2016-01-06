export default class P2BodyEditor {
  tbody: HTMLTableSectionElement;
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};
  shapeRows: HTMLTableRowElement[] = [];

  sizeRow: SupClient.table.RowParts;
  radiusRow: SupClient.table.RowParts;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    let massRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:P2Body.mass"));
    this.fields["mass"] = SupClient.table.appendNumberField(massRow.valueCell, config.mass, { min: 0 });
    this.fields["mass"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "mass", parseFloat(event.target.value));
    });

    let fixedRotationRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:P2Body.fixedRotation"));
    this.fields["fixedRotation"] = SupClient.table.appendBooleanField(fixedRotationRow.valueCell, config.fixedRotation);
    this.fields["fixedRotation"].addEventListener("click", (event: any) => {
      this.editConfig("setProperty", "fixedRotation", event.target.checked);
    });

    let offsetRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:P2Body.offset"));
    let offsetFields = SupClient.table.appendNumberFields(offsetRow.valueCell, [config.offsetX, config.offsetY]);
    this.fields["offsetX"] = offsetFields[0];
    this.fields["offsetX"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetX", parseFloat(event.target.value));
    });

    this.fields["offsetY"] = offsetFields[1];
    this.fields["offsetY"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetY", parseFloat(event.target.value));
    });

    let shapeRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:P2Body.shape"));
    let shapeOptions: { [key: string]: string} = {
      "box": SupClient.i18n.t("componentEditors:P2Body.shapeOptions.box"),
      "circle": SupClient.i18n.t("componentEditors:P2Body.shapeOptions.circle")
    };
    this.fields["shape"] = SupClient.table.appendSelectBox(shapeRow.valueCell, shapeOptions, config.shape);
    this.fields["shape"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shape", event.target.value);
    });

    // Box
    this.sizeRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:P2Body.size"));
    this.shapeRows.push(this.sizeRow.row);

    let sizeFields = SupClient.table.appendNumberFields(this.sizeRow.valueCell, [config.width, config.height], 0);
    this.fields["width"] = sizeFields[0];
    this.fields["width"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "width", parseFloat(event.target.value));
    });

    this.fields["height"] = sizeFields[1];
    this.fields["height"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "height", parseFloat(event.target.value));
    });

    // Circle
    this.radiusRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:P2Body.radius"));
    this.shapeRows.push(this.radiusRow.row);
    this.fields["radius"] = SupClient.table.appendNumberField(this.radiusRow.valueCell, config.radius, { min: 0 });
    this.fields["radius"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "radius", parseFloat(event.target.value));
    });

    this.updateShapeInput(config.shape);
  }

  updateShapeInput(shape: string) {
    for (let row of this.shapeRows) this.tbody.removeChild(row);
    this.shapeRows.length = 0;

    switch (shape) {
      case "box": {
        this.tbody.appendChild(this.sizeRow.row);
        this.shapeRows.push(this.sizeRow.row);
      } break;

      case "circle": {
        this.tbody.appendChild(this.radiusRow.row);
        this.shapeRows.push(this.radiusRow.row);
      } break;
    }
  }

  destroy() { /* Nothing to do here */ }

  config_setProperty(path: string, value: any) {
    if (path === "fixedRotation") (<HTMLInputElement>this.fields["fixedRotation"]).checked = value;
    else this.fields[path].value = value;

    if (path === "shape") this.updateShapeInput(value);
  }
}
