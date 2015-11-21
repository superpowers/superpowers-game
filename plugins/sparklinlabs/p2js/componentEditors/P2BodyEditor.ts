export default class P2BodyEditor {
  tbody: HTMLTableSectionElement;
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};
  shapeRows: HTMLTableRowElement[] = [];

  widthRow: SupClient.table.RowParts;
  heightRow: SupClient.table.RowParts;
  radiusRow: SupClient.table.RowParts;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    let massRow = SupClient.table.appendRow(this.tbody, "Mass");
    this.fields["mass"] = SupClient.table.appendNumberField(massRow.valueCell, config.mass, 0);
    this.fields["mass"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "mass", parseFloat(event.target.value));
    });

    let fixedRotationRow = SupClient.table.appendRow(this.tbody, "Fixed rotation");
    this.fields["fixedRotation"] = SupClient.table.appendBooleanField(fixedRotationRow.valueCell, config.fixedRotation);
    this.fields["fixedRotation"].addEventListener("click", (event: any) => {
      this.editConfig("setProperty", "fixedRotation", event.target.checked);
    });

    let offsetX = SupClient.table.appendRow(this.tbody, "Offset X");
    this.fields["offsetX"] = SupClient.table.appendNumberField(offsetX.valueCell, config.offsetX);
    this.fields["offsetX"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetX", parseFloat(event.target.value));
    });

    let offsetY = SupClient.table.appendRow(this.tbody, "Offset Y");
    this.fields["offsetY"] = SupClient.table.appendNumberField(offsetY.valueCell, config.offsetY);
    this.fields["offsetY"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetY", parseFloat(event.target.value));
    });

    let shapeRow = SupClient.table.appendRow(this.tbody, "Shape");
    this.fields["shape"] = SupClient.table.appendSelectBox(shapeRow.valueCell, {
      "box": "Box",
      "circle": "Circle"
    });
    this.fields["shape"].value = config.shape;
    this.fields["shape"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shape", event.target.value);
    });

    // Box
    this.widthRow = SupClient.table.appendRow(this.tbody, "Width");
    this.shapeRows.push(this.widthRow.row);
    this.fields["width"] = SupClient.table.appendNumberField(this.widthRow.valueCell, config.width, 0);
    this.fields["width"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "width", parseFloat(event.target.value));
    });

    this.heightRow = SupClient.table.appendRow(this.tbody, "Height");
    this.shapeRows.push(this.heightRow.row);
    this.fields["height"] = SupClient.table.appendNumberField(this.heightRow.valueCell, config.height, 0);
    this.fields["height"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "height", parseFloat(event.target.value));
    });

    // Circle
    this.radiusRow = SupClient.table.appendRow(this.tbody, "Radius");
    this.shapeRows.push(this.radiusRow.row);
    this.fields["radius"] = SupClient.table.appendNumberField(this.radiusRow.valueCell, config.radius, 0);
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
        this.tbody.appendChild(this.widthRow.row);
        this.shapeRows.push(this.widthRow.row);
        this.tbody.appendChild(this.heightRow.row);
        this.shapeRows.push(this.heightRow.row);
        break;
      }

      case "circle": {
        this.tbody.appendChild(this.radiusRow.row);
        this.shapeRows.push(this.radiusRow.row);
        break;
      }
    }
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    if (path === "fixedRotation") (<HTMLInputElement>this.fields["fixedRotation"]).checked = value;
    else this.fields[path].value = value;

    if (path === "shape") this.updateShapeInput(value);
  }
}
