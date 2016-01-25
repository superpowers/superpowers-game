import CubicModelSettingsResource from "../data/CubicModelSettingsResource";

export default class CubicModelSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: CubicModelSettingsResource;

  pixelsPerUnitRow: SupClient.table.RowParts;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    this.pixelsPerUnitRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:CubicModel.pixelsPerUnit"));
    this.fields["pixelsPerUnit"] = SupClient.table.appendNumberField(this.pixelsPerUnitRow.valueCell, "");
    this.fields["pixelsPerUnit"].addEventListener("change", (event: any) => {
      this.projectClient.editResource("cubicModelSettings", "setProperty", "pixelsPerUnit", parseInt(event.target.value, 10));
    });

    this.projectClient.subResource("cubicModelSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: CubicModelSettingsResource) => {
    this.resource = resource;

    for (let setting in resource.pub) {
      this.fields[setting].value = resource.pub[setting];
    }
  };

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.fields[propertyName].value = this.resource.pub[propertyName];
  };
}
