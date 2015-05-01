export default
class CannonBodyEditor {

  tbody:HTMLDivElement;
  fields:{[name:string]:HTMLInputElement|HTMLSelectElement};
  shapeRows:HTMLTableRowElement[];
  projectClient:SupClient.ProjectClient;
  editConfig:any;
  halfWidthRow:{rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement; checkboxElt: HTMLInputElement;};
  halfHeightRow:{rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement; checkboxElt: HTMLInputElement;};
  halfDepthRow:{rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement; checkboxElt: HTMLInputElement;};
  radiusRow:{rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement; checkboxElt: HTMLInputElement;};
  heightRow:{rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement; checkboxElt: HTMLInputElement;};

  constructor(tbody:HTMLDivElement, config:any, projectClient:SupClient.ProjectClient, editConfig:any) {
    this.projectClient = projectClient;
    this.editConfig = editConfig;
    this.tbody = tbody;
    this.shapeRows = [];
    this.fields = {};
    let massRow = SupClient.component.createSetting(this.tbody, "Mass");
    this.fields["mass"] = SupClient.component.createNumberField(massRow.valueElt, config.mass, 0);
    this.fields["mass"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "mass", parseFloat((<HTMLInputElement>event.target).value));
      });

    let fixedRotationRow = SupClient.component.createSetting(this.tbody, "Fixed rotation");
    this.fields["fixedRotation"] = SupClient.component.createBooleanField(fixedRotationRow.valueElt, config.fixedRotation);
    this.fields["fixedRotation"].addEventListener("click", (event) => {
      this.editConfig("setProperty", "fixedRotation", (<HTMLInputElement>event.target).checked);
    });

    let offsetX = SupClient.component.createSetting(this.tbody, "Offset X");
    this.fields["offsetX"] = SupClient.component.createNumberField(offsetX.valueElt, config.offsetX);
    this.fields["offsetX"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "offsetX", parseFloat((<HTMLInputElement>event.target).value));
    });

    let offsetY = SupClient.component.createSetting(this.tbody, "Offset Y");
    this.fields["offsetY"] = SupClient.component.createNumberField(offsetY.valueElt, config.offsetY);
    this.fields["offsetY"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "offsetY", parseFloat((<HTMLInputElement>event.target).value));
      });

    let offsetZ = SupClient.component.createSetting(this.tbody, "Offset Z");
    this.fields["offsetZ"] = SupClient.component.createNumberField(offsetZ.valueElt, config.offsetZ);
    this.fields["offsetZ"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "offsetZ", parseFloat((<HTMLInputElement>event.target).value));
    });

    let shapeRow = SupClient.component.createSetting(this.tbody, "Shape");
    this.fields["shape"] = SupClient.component.createSelectBox(shapeRow.valueElt, {
      "box": "Box",
      "sphere": "Sphere",
      "cylinder": "Cylinder"
    });
    this.fields["shape"].value = config.shape;
    this.fields["shape"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "shape", (<HTMLInputElement>event.target).value);
    });

    //Box
    this.halfWidthRow = SupClient.component.createSetting(this.tbody, "Half width");
    this.shapeRows.push(this.halfWidthRow.rowElt);
    this.fields["halfWidth"] = SupClient.component.createNumberField(this.halfWidthRow.valueElt, config.halfWidth, 0);
    this.fields["halfWidth"].addEventListener(
      "change", (event) => {
        this.editConfig("setProperty", "halfWidth", parseFloat((<HTMLInputElement>event.target).value));
      });

    this.halfHeightRow = SupClient.component.createSetting(this.tbody, "Half height");
    this.shapeRows.push(this.halfHeightRow.rowElt);
    this.fields["halfHeight"] = SupClient.component.createNumberField(this.halfHeightRow.valueElt, config.halfHeight, 0);

    this.fields["halfHeight"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "halfHeight", parseFloat((<HTMLInputElement>event.target).value));
    });

    this.halfDepthRow = SupClient.component.createSetting(this.tbody, "Half depth");

    this.shapeRows.push(this.halfDepthRow.rowElt);
    this.fields["halfDepth"] = SupClient.component.createNumberField(this.halfDepthRow.valueElt, config.halfDepth, 0);
    this.fields["halfDepth"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "halfDepth", parseFloat((<HTMLInputElement>event.target).value));
    });


    // Sphere / Cylinder
    this.radiusRow = SupClient.component.createSetting(this.tbody, "Radius");

    this.shapeRows.push(this.radiusRow.rowElt);

    this.fields["radius"] = SupClient.component.createNumberField(this.radiusRow.valueElt, config.radius, 0);

    this.fields["radius"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "radius", parseFloat((<HTMLInputElement>event.target).value));
    });

    this.heightRow = SupClient.component.createSetting(this.tbody, "Height");
    this.shapeRows.push(this.heightRow.rowElt);
    this.fields["height"] = SupClient.component.createNumberField(this.heightRow.valueElt, config.height, 0);
    this.fields["height"].addEventListener("change", (event) => {
      this.editConfig("setProperty", "height", parseFloat((<HTMLInputElement>event.target).value))
    });

    this.updateShapeInput(config.shape);
  }

  updateShapeInput(shape:string) {

    for (let rowElt of this.shapeRows) this.tbody.removeChild(rowElt);

    this.shapeRows.length = 0;

    switch (shape) {
      case "box":
        this.tbody.appendChild(this.halfWidthRow.rowElt);
        this.shapeRows.push(this.halfWidthRow.rowElt);
        this.tbody.appendChild(this.halfHeightRow.rowElt);
        this.shapeRows.push(this.halfHeightRow.rowElt);
        this.tbody.appendChild(this.halfDepthRow.rowElt);
        this.shapeRows.push(this.halfDepthRow.rowElt);
        break;
      case "sphere":
        this.tbody.appendChild(this.radiusRow.rowElt);
        this.shapeRows.push(this.radiusRow.rowElt);
        break;

      case "cylinder":
        this.tbody.appendChild(this.radiusRow.rowElt);
        this.shapeRows.push(this.radiusRow.rowElt);
        this.tbody.appendChild(this.heightRow.rowElt);
        this.shapeRows.push(this.heightRow.rowElt);
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