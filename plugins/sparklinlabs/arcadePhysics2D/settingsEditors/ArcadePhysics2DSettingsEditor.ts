import ArcadePhysics2DSettingsResource from "../data/ArcadePhysics2DSettingsResource";

export default class ArcadePhysics2DSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: ArcadePhysics2DSettingsResource;

  filteringRow: SupClient.table.RowParts;
  fpsRow: SupClient.table.RowParts;
  pixelsPerUnitRow: SupClient.table.RowParts;
  alphaTestRow: SupClient.table.RowParts;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    let planeRow = SupClient.table.appendRow(tbody, "Plane");
    this.fields["plane"] = SupClient.table.appendSelectBox(planeRow.valueCell, { XY: "XY", XZ: "XZ" });
    this.fields["plane"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "arcadePhysics2DSettings", "setProperty", "plane", event.target.value, (err: string) => { if (err != null) alert(err); });
    });

    this.projectClient.subResource("arcadePhysics2DSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: ArcadePhysics2DSettingsResource) => {
    this.resource = resource;

    for (let setting in resource.pub) {
      this.fields[setting].value = resource.pub[setting];
    }
  }

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.fields[propertyName].value = this.resource.pub[propertyName];
  }
}
