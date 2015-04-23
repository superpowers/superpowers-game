class ArcadeBody2DEditor {
  fields: {[name: string]: HTMLInputElement};
  editConfig: any;

  constructor(tbody: HTMLDivElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.fields = {};
    this.editConfig = editConfig;

    let movableRow = SupClient.component.createSetting(tbody, "Movable");
    this.fields["movable"] = SupClient.component.createBooleanField(movableRow.valueElt, config.movable);
    this.fields["movable"].addEventListener("click", (event: any) => {
      this.editConfig("setProperty", "movable", event.target.checked);
    });

    let widthRow = SupClient.component.createSetting(tbody, "Width");
    this.fields["width"] = SupClient.component.createNumberField(widthRow.valueElt, config.width, 0);
    this.fields["width"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "width", parseFloat(event.target.value));
    });

    let heightRow = SupClient.component.createSetting(tbody, "Height");
    this.fields["height"] = SupClient.component.createNumberField(heightRow.valueElt, config.height, 0);
    this.fields["height"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "height", parseFloat(event.target.value));
    });

    let offsetX = SupClient.component.createSetting(tbody, "Offset X");
    this.fields["offsetX"] = SupClient.component.createNumberField(offsetX.valueElt, config.offsetX, 0);
    this.fields["offsetX"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetX", parseFloat(event.target.value));
    });

    let offsetY = SupClient.component.createSetting(tbody, "Offset Y");
    this.fields["offsetY"] = SupClient.component.createNumberField(offsetY.valueElt, config.offsetY, 0);
    this.fields["offsetY"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "offsetY", parseFloat(event.target.value));
    });
  }

  destroy() {}
  config_setProperty(path: string, value: any) {
    if (path === "movable") this.fields["movable"].checked = value;
    else this.fields[path].value = value;
  }
}
export = ArcadeBody2DEditor;
