import LightSettingsResource from "../data/LightSettingsResource";

export default class LightSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: LightSettingsResource;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    let shadowMapTypeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Light.shadowMapType"));
    this.fields["shadowMapType"] = SupClient.table.appendSelectBox(shadowMapTypeRow.valueCell, { "basic": "Basic", "pcf": "PCF", "pcfSoft": "PCF Soft" });

    this.fields["shadowMapType"].addEventListener("change", (event: any) => {
      this.projectClient.socket.emit("edit:resources", "lightSettings", "setProperty", "shadowMapType", event.target.value, (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
    });

    this.projectClient.subResource("lightSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: LightSettingsResource) => {
    this.resource = resource;

    for (let setting in resource.pub) {
      this.fields[setting].value = resource.pub[setting];
    }
  };

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.fields[propertyName].value = this.resource.pub[propertyName];
  };
}
