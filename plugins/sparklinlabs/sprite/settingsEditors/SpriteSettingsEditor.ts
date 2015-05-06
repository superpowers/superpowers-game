import SpriteSettingsResource from "../data/SpriteSettingsResource";

export default class SpriteSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: SpriteSettingsResource;

  filteringRow: SupClient.table.RowParts;
  fpsRow: SupClient.table.RowParts;
  pixelsPerUnitRow: SupClient.table.RowParts;
  alphaTestRow: SupClient.table.RowParts;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};

  constructor(tbody: HTMLTableSectionElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    this.filteringRow = SupClient.table.appendRow(tbody, "Filtering");
    this.fields["filtering"] = SupClient.table.appendSelectBox(this.filteringRow.valueCell, { pixelated: "Pixelated", smooth: "Smooth" });

    this.fpsRow = SupClient.table.appendRow(tbody, "Frames per second");
    this.fields["framesPerSecond"] = SupClient.table.appendNumberField(this.fpsRow.valueCell, "");

    this.pixelsPerUnitRow = SupClient.table.appendRow(tbody, "Pixels per unit");
    this.fields["pixelsPerUnit"] = SupClient.table.appendNumberField(this.pixelsPerUnitRow.valueCell, "");

    this.alphaTestRow = SupClient.table.appendRow(tbody, "Alpha testing");
    this.fields["alphaTest"] = SupClient.table.appendNumberField(this.alphaTestRow.valueCell, "");

    this.fields["filtering"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "spriteSettings", "setProperty", "filtering", event.target.value, (err: string) => { if (err != null) alert(err); });
    });

    this.fields["framesPerSecond"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "spriteSettings", "setProperty", "framesPerSecond", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.fields["pixelsPerUnit"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "spriteSettings", "setProperty", "pixelsPerUnit", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.fields["alphaTest"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "spriteSettings", "setProperty", "alphaTest", parseFloat(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.projectClient.subResource("spriteSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: SpriteSettingsResource) => {
    this.resource = resource;

    for (let setting in resource.pub) {
      this.fields[setting].value = resource.pub[setting];
    }
  }

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.fields[propertyName].value = this.resource.pub[propertyName];
  }
}
