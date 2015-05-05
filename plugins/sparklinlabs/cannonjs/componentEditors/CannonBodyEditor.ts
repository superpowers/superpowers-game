export default
class CannonBodyEditor {

  tbody: HTMLTableSectionElement;
  fields: { [name:string]: HTMLInputElement|HTMLSelectElement };
  shapeRows :HTMLTableRowElement[];
  projectClient: SupClient.ProjectClient;
  editConfig: any;
  halfWidthRow: SupClient.table.RowParts;
  halfHeightRow: SupClient.table.RowParts;
  halfDepthRow: SupClient.table.RowParts;
  radiusRow: SupClient.table.RowParts;
  heightRow: SupClient.table.RowParts;

  constructor(tbody: HTMLTableSectionElement, config:any, projectClient:SupClient.ProjectClient, editConfig:any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.tbody = tbody;
    this.shapeRows = [];
    this.fields = {};
    let massRow = SupClient.table.appendRow(this.tbody, "Mass");
    this.fields["mass"] = SupClient.table.appendNumberField(massRow.valueCell, config.mass, 0);
    this.fields["mass"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "mass", parseFloat((<HTMLInputElement>event.target).value));
      });

    let fixedRotationRow = SupClient.table.appendRow(this.tbody, "Fixed rotation");
    this.fields["fixedRotation"] = SupClient.table.appendBooleanField(fixedRotationRow.valueCell, config.fixedRotation);
    this.fields["fixedRotation"].addEventListener("click", (event) => {
      this.editConfig("setProperty", "fixedRotation", (<HTMLInputElement>event.target).checked);
    });

    let offsetX = SupClient.table.appendRow(this.tbody, "Offset X");
    this.fields["offsetX"] = SupClient.table.appendNumberField(offsetX.valueCell, config.offsetX);
    this.fields["offsetX"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "offsetX", parseFloat((<HTMLInputElement>event.target).value));
    });

    let offsetY = SupClient.table.appendRow(this.tbody, "Offset Y");
    this.fields["offsetY"] = SupClient.table.appendNumberField(offsetY.valueCell, config.offsetY);
    this.fields["offsetY"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "offsetY", parseFloat((<HTMLInputElement>event.target).value));
      });

    let offsetZ = SupClient.table.appendRow(this.tbody, "Offset Z");
    this.fields["offsetZ"] = SupClient.table.appendNumberField(offsetZ.valueCell, config.offsetZ);
    this.fields["offsetZ"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "offsetZ", parseFloat((<HTMLInputElement>event.target).value));
    });

    let shapeRow = SupClient.table.appendRow(this.tbody, "Shape");
    this.fields["shape"] = SupClient.table.appendSelectBox(shapeRow.valueCell, {
      "box": "Box",
      "sphere": "Sphere",
      "cylinder": "Cylinder"
    });
    this.fields["shape"].value = config.shape;
    this.fields["shape"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "shape", (<HTMLInputElement>event.target).value);
    });

    // Box
    this.halfWidthRow = SupClient.table.appendRow(this.tbody, "Half width");
    this.shapeRows.push(this.halfWidthRow.row);
    this.fields["halfWidth"] = SupClient.table.appendNumberField(this.halfWidthRow.valueCell, config.halfWidth, 0);
    this.fields["halfWidth"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "halfWidth", parseFloat((<HTMLInputElement>event.target).value));
      });

    this.halfHeightRow = SupClient.table.appendRow(this.tbody, "Half height");
    this.shapeRows.push(this.halfHeightRow.row);
    this.fields["halfHeight"] = SupClient.table.appendNumberField(this.halfHeightRow.valueCell, config.halfHeight, 0);

    this.fields["halfHeight"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "halfHeight", parseFloat((<HTMLInputElement>event.target).value));
    });

    this.halfDepthRow = SupClient.table.appendRow(this.tbody, "Half depth");

    this.shapeRows.push(this.halfDepthRow.row);
    this.fields["halfDepth"] = SupClient.table.appendNumberField(this.halfDepthRow.valueCell, config.halfDepth, 0);
    this.fields["halfDepth"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "halfDepth", parseFloat((<HTMLInputElement>event.target).value));
    });


    // Sphere / Cylinder
    this.radiusRow = SupClient.table.appendRow(this.tbody, "Radius");

    this.shapeRows.push(this.radiusRow.row);

    this.fields["radius"] = SupClient.table.appendNumberField(this.radiusRow.valueCell, config.radius, 0);

    this.fields["radius"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "radius", parseFloat((<HTMLInputElement>event.target).value));
    });

    this.heightRow = SupClient.table.appendRow(this.tbody, "Height");
    this.shapeRows.push(this.heightRow.row);
    this.fields["height"] = SupClient.table.appendNumberField(this.heightRow.valueCell, config.height, 0);
    this.fields["height"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "height", parseFloat((<HTMLInputElement>event.target).value))
    });

    this.updateShapeInput(config.shape);
  }

  updateShapeInput(shape:string) {

    for (let row of this.shapeRows) this.tbody.removeChild(row);

    this.shapeRows.length = 0;

    switch (shape) {
      case "box":
        this.tbody.appendChild(this.halfWidthRow.row);
        this.shapeRows.push(this.halfWidthRow.row);
        this.tbody.appendChild(this.halfHeightRow.row);
        this.shapeRows.push(this.halfHeightRow.row);
        this.tbody.appendChild(this.halfDepthRow.row);
        this.shapeRows.push(this.halfDepthRow.row);
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


  destroy() {}

  config_setProperty(path:string, value:any) {
    if (path === "fixedRotation") (<HTMLInputElement>this.fields["fixedRotation"]).checked = value;
    else this.fields[path].value = value;

    if (path === "shape") this.updateShapeInput(value)
  }

}