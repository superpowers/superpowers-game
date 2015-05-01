export default class P2BodyEditor {
  tbody: HTMLDivElement;
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};
  shapeRows: HTMLTableRowElement[] = [];

  widthRow: { rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement, checkboxElt: HTMLInputElement; };
  heightRow: { rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement, checkboxElt: HTMLInputElement; };
  radiusRow: { rowElt: HTMLTableRowElement; keyElt: HTMLTableHeaderCellElement; valueElt: HTMLTableDataCellElement, checkboxElt: HTMLInputElement; };

  constructor(tbody: HTMLDivElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.projectClient = projectClient;
    this.editConfig = editConfig;

    let massRow = SupClient.component.createSetting(this.tbody, "Mass");
    this.fields["mass"] = SupClient.component.createNumberField(massRow.valueElt, config.mass, 0);
    this.fields["mass"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "mass", parseFloat(event.target.value));
    });

    let fixedRotationRow = SupClient.component.createSetting(this.tbody, "Fixed rotation");
    this.fields["fixedRotation"] = SupClient.component.createBooleanField(fixedRotationRow.valueElt, config.fixedRotation);
    this.fields["fixedRotation"].addEventListener("click", (event: any) => {
      this.editConfig("setProperty", "fixedRotation", event.target.checked);
    });

    let offsetX = SupClient.component.createSetting(this.tbody, "Offset X");
    this.fields["offsetX"] = SupClient.component.createNumberField(offsetX.valueElt, config.offsetX);
    this.fields["offsetX"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetX", parseFloat(event.target.value));
    });

    let offsetY = SupClient.component.createSetting(this.tbody, "Offset Y");
    this.fields["offsetY"] = SupClient.component.createNumberField(offsetY.valueElt, config.offsetY);
    this.fields["offsetY"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetY", parseFloat(event.target.value));
    });

    let shapeRow = SupClient.component.createSetting(this.tbody, "Shape");
    this.fields["shape"] = SupClient.component.createSelectBox(shapeRow.valueElt, {
      "rectangle": "Rectangle",
      "circle": "Circle"
    });
    this.fields["shape"].value = config.shape
    this.fields["shape"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "shape", event.target.value);
    });

    // Rectangle
    this.widthRow = SupClient.component.createSetting(this.tbody, "Width");
    this.shapeRows.push(this.widthRow.rowElt);
    this.fields["width"] = SupClient.component.createNumberField(this.widthRow.valueElt, config.width, 0);
    this.fields["width"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "width", parseFloat(event.target.value));
    });

    this.heightRow = SupClient.component.createSetting(this.tbody, "Height");
    this.shapeRows.push(this.heightRow.rowElt);
    this.fields["height"] = SupClient.component.createNumberField(this.heightRow.valueElt, config.height, 0);
    this.fields["height"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "height", parseFloat(event.target.value));
    });

    // Circle
    this.radiusRow = SupClient.component.createSetting(this.tbody, "Radius");
    this.shapeRows.push(this.radiusRow.rowElt);
    this.fields["radius"] = SupClient.component.createNumberField(this.radiusRow.valueElt, config.radius, 0);
    this.fields["radius"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "radius", parseFloat(event.target.value));
    });

    this.updateShapeInput(config.shape);
  }

  updateShapeInput(shape: string) {
    for (let rowElt of this.shapeRows) this.tbody.removeChild(rowElt);
    this.shapeRows.length = 0;

    switch (shape) {
      case "rectangle": {
        this.tbody.appendChild(this.widthRow.rowElt);
        this.shapeRows.push(this.widthRow.rowElt);
        this.tbody.appendChild(this.heightRow.rowElt);
        this.shapeRows.push(this.heightRow.rowElt);
        break;
      }

      case "circle": {
        this.tbody.appendChild(this.radiusRow.rowElt);
        this.shapeRows.push(this.radiusRow.rowElt);
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
