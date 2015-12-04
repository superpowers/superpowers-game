export default class CannonBodyEditor {

  tbody: HTMLTableSectionElement;
  fields: { [name: string]: HTMLInputElement|HTMLSelectElement };
  shapeRows: HTMLTableRowElement[];
  projectClient: SupClient.ProjectClient;
  editConfig: any;
  halfSizeRow: SupClient.table.RowParts;
  radiusRow: SupClient.table.RowParts;
  heightRow: SupClient.table.RowParts;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.tbody = tbody;
    this.shapeRows = [];
    this.fields = {};
    let massRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:CannonBody.mass"));
    this.fields["mass"] = SupClient.table.appendNumberField(massRow.valueCell, config.mass, 0);
    this.fields["mass"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "mass", parseFloat((<HTMLInputElement>event.target).value));
      });

    let fixedRotationRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:CannonBody.fixedRotation"));
    this.fields["fixedRotation"] = SupClient.table.appendBooleanField(fixedRotationRow.valueCell, config.fixedRotation);
    this.fields["fixedRotation"].addEventListener("click", (event) => {
      this.editConfig("setProperty", "fixedRotation", (<HTMLInputElement>event.target).checked);
    });

    let offsetRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:CannonBody.offset"));
    let offsetFields = SupClient.table.appendNumberFields(offsetRow.valueCell, [ config.offset.x, config.offset.y, config.offset.z ]);
    this.fields["offset.x"] = offsetFields[0];
    this.fields["offset.y"] = offsetFields[1];
    this.fields["offset.z"] = offsetFields[2];

    this.fields["offset.x"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "offset.x", parseFloat((<HTMLInputElement>event.target).value));
    });

    this.fields["offset.y"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "offset.y", parseFloat((<HTMLInputElement>event.target).value));
      });

    this.fields["offset.z"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "offset.z", parseFloat((<HTMLInputElement>event.target).value));
    });

    SupClient.table.appendHeader(this.tbody, SupClient.i18n.t("componentEditors:CannonBody.shape"));
    let shapeTypeRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:CannonBody.shapeType"));
    this.fields["shape"] = SupClient.table.appendSelectBox(shapeTypeRow.valueCell, {
      "box": SupClient.i18n.t("componentEditors:CannonBody.shapeOptions.box"),
      "sphere": SupClient.i18n.t("componentEditors:CannonBody.shapeOptions.sphere"),
      "cylinder": SupClient.i18n.t("componentEditors:CannonBody.shapeOptions.cylinder")
    });
    this.fields["shape"].value = config.shape;
    this.fields["shape"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "shape", (<HTMLInputElement>event.target).value);
    });

    // Box
    this.halfSizeRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:CannonBody.halfSize"));
    this.shapeRows.push(this.halfSizeRow.row);
    let halfSizeFields = SupClient.table.appendNumberFields(this.halfSizeRow.valueCell, [ config.halfSize.x, config.halfSize.y, config.halfSize.z ], 0);
    this.fields["halfSize.x"] = halfSizeFields[0];
    this.fields["halfSize.y"] = halfSizeFields[1];
    this.fields["halfSize.z"] = halfSizeFields[2];

    this.fields["halfSize.x"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "halfSize.x", parseFloat((<HTMLInputElement>event.target).value));
      });

    this.fields["halfSize.y"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "halfSize.y", parseFloat((<HTMLInputElement>event.target).value));
    });

    this.fields["halfSize.z"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "halfSize.z", parseFloat((<HTMLInputElement>event.target).value));
    });

    // Sphere / Cylinder
    this.radiusRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:CannonBody.radius"));
    this.shapeRows.push(this.radiusRow.row);
    this.fields["radius"] = SupClient.table.appendNumberField(this.radiusRow.valueCell, config.radius, 0);
    this.fields["radius"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "radius", parseFloat((<HTMLInputElement>event.target).value));
    });

    this.heightRow = SupClient.table.appendRow(this.tbody, SupClient.i18n.t("componentEditors:CannonBody.height"));
    this.shapeRows.push(this.heightRow.row);
    this.fields["height"] = SupClient.table.appendNumberField(this.heightRow.valueCell, config.height, 0);
    this.fields["height"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "height", parseFloat((<HTMLInputElement>event.target).value));
    });

    this.updateShapeInput(config.shape);
  }

  updateShapeInput(shape: string) {

    for (let row of this.shapeRows) this.tbody.removeChild(row);
    this.shapeRows.length = 0;

    switch (shape) {
      case "box":
        this.tbody.appendChild(this.halfSizeRow.row);
        this.shapeRows.push(this.halfSizeRow.row);
        break;
      case "sphere":
        this.tbody.appendChild(this.radiusRow.row);
        this.shapeRows.push(this.radiusRow.row);
        break;

      case "cylinder":
        this.tbody.appendChild(this.radiusRow.row);
        this.shapeRows.push(this.radiusRow.row);
        this.tbody.appendChild(this.heightRow.row);
        this.shapeRows.push(this.heightRow.row);
        break;
    }
  }

  destroy() { /* Nothing to do here */ }

  config_setProperty(path: string, value: any) {
    if (path === "fixedRotation") (<HTMLInputElement>this.fields["fixedRotation"]).checked = value;
    else this.fields[path].value = value;

    if (path === "shape") this.updateShapeInput(value);
  }
}
