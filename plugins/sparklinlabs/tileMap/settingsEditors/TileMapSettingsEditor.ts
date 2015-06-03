import TileMapSettingsResource from "../data/TileMapSettingsResource";

export default class TileMapSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: TileMapSettingsResource;

  pixelsPerUnitRow: SupClient.table.RowParts;
  defaultWidthRow: SupClient.table.RowParts;
  defaultHeightRow: SupClient.table.RowParts;
  depthOffsetRow: SupClient.table.RowParts;
  gridSizeRow: SupClient.table.RowParts;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    this.pixelsPerUnitRow = SupClient.table.appendRow(tbody, "Pixels per unit");
    this.fields["pixelsPerUnit"] = SupClient.table.appendNumberField(this.pixelsPerUnitRow.valueCell, "");

    this.defaultWidthRow = SupClient.table.appendRow(tbody, "Default width");
    this.fields["width"] = SupClient.table.appendNumberField(this.defaultWidthRow.valueCell, "");

    this.defaultHeightRow = SupClient.table.appendRow(tbody, "Default height");
    this.fields["height"] = SupClient.table.appendNumberField(this.defaultHeightRow.valueCell, "");

    this.depthOffsetRow = SupClient.table.appendRow(tbody, "Depth Offset");
    this.fields["layerDepthOffset"] = SupClient.table.appendNumberField(this.depthOffsetRow.valueCell, "");

    this.gridSizeRow = SupClient.table.appendRow(tbody, "Tile set grid size");
    let gridFields = SupClient.table.appendNumberFields(this.gridSizeRow.valueCell, [null, null]);
    this.fields["grid.width"] = gridFields[0];
    this.fields["grid.height"] = gridFields[1];

    this.fields["pixelsPerUnit"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "tileMapSettings", "setProperty", "pixelsPerUnit", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.fields["width"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "tileMapSettings", "setProperty", "width", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.fields["height"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "tileMapSettings", "setProperty", "height", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.fields["layerDepthOffset"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "tileMapSettings", "setProperty", "layerDepthOffset", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.fields["grid.width"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "tileMapSettings", "setProperty", "grid.width", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });
    
    this.fields["grid.height"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "tileMapSettings", "setProperty", "grid.height", parseInt(event.target.value), (err: string) => { if (err != null) alert(err); });
    });

    this.projectClient.subResource("tileMapSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: TileMapSettingsResource) => {
    this.resource = resource;

    for (let setting in resource.pub) {
      this.fields[setting].value = (<any>resource.pub)[setting];
    }
  }

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.fields[propertyName].value = (<any>this.resource.pub)[propertyName];
  }
}
