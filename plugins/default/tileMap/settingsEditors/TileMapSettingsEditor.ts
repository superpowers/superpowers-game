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

    const { tbody } = SupClient.table.createTable(container);

    this.pixelsPerUnitRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TileMap.pixelsPerUnit"));
    this.fields["pixelsPerUnit"] = SupClient.table.appendNumberField(this.pixelsPerUnitRow.valueCell, "");

    this.defaultWidthRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TileMap.defaultWidth"));
    this.fields["width"] = SupClient.table.appendNumberField(this.defaultWidthRow.valueCell, "");

    this.defaultHeightRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TileMap.defaultHeight"));
    this.fields["height"] = SupClient.table.appendNumberField(this.defaultHeightRow.valueCell, "");

    this.depthOffsetRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TileMap.depthOffset"));
    this.fields["layerDepthOffset"] = SupClient.table.appendNumberField(this.depthOffsetRow.valueCell, "");

    this.gridSizeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:TileMap.tileSetGridSize"));
    const gridFields = SupClient.table.appendNumberFields(this.gridSizeRow.valueCell, ["", ""]);
    this.fields["grid.width"] = gridFields[0];
    this.fields["grid.height"] = gridFields[1];

    const fieldNames = Object.keys(this.fields);
    fieldNames.forEach((fieldName) => {
      const field = this.fields[fieldName];
      field.addEventListener("change", (event: any) => {
        this.projectClient.editResource("tileMapSettings", "setProperty", fieldName, parseInt(event.target.value, 10));
      });
    });
    this.projectClient.subResource("tileMapSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: TileMapSettingsResource) => {
    this.resource = resource;

    for (const setting in resource.pub) {
      if (setting === "formatVersion") continue;

      if (setting === "grid") {
        this.fields["grid.width"].value = resource.pub.grid.width.toString();
        this.fields["grid.height"].value = resource.pub.grid.height.toString();
      } else this.fields[setting].value = (<any>resource.pub)[setting];
    }
  };

  onResourceEdited = (resourceId: string, command: string, propertyName: string, value: any) => {
    this.fields[propertyName].value = value;
  };
}
