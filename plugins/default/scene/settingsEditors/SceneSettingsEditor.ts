import SceneSettingsResource from "../data/SceneSettingsResource";

export default class SceneSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: SceneSettingsResource;

  fields: { [name: string]: HTMLInputElement|HTMLSelectElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    let { tbody } = SupClient.table.createTable(container);

    let defaultCameraModeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Scene.defaultCameraMode"));
    this.fields["defaultCameraMode"] = SupClient.table.appendSelectBox(defaultCameraModeRow.valueCell, { "3D": "3D", "2D": "2D" });

    this.fields["defaultCameraMode"].addEventListener("change", (event: any) => {
      this.projectClient.editResource("sceneSettings", "setProperty", "defaultCameraMode", event.target.value);
    });

    let defaultVerticalAxisRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("settingsEditors:Scene.defaultCameraVerticalAxis"));
    this.fields["defaultVerticalAxis"] = SupClient.table.appendSelectBox(defaultVerticalAxisRow.valueCell, { "Y": "Y", "Z": "Z" });

    this.fields["defaultVerticalAxis"].addEventListener("change", (event: any) => {
      this.projectClient.editResource("sceneSettings", "setProperty", "defaultVerticalAxis", event.target.value);
    });

    this.projectClient.subResource("sceneSettings", this);
  }

  onResourceReceived = (resourceId: string, resource: SceneSettingsResource) => {
    this.resource = resource;

    for (let setting in resource.pub) {
      if (setting === "formatVersion") continue;
      this.fields[setting].value = resource.pub[setting];
    }
  };

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.fields[propertyName].value = this.resource.pub[propertyName];
  };
}
