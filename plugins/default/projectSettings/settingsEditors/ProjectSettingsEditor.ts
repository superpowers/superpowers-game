export default class ProjectSettingsEditor {

  projectClient: SupClient.ProjectClient;

  fields: { [name: string]: HTMLInputElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    // Vacuum
    {
      const vacuumContainer = <HTMLDivElement>document.createElement("div");
      container.appendChild(vacuumContainer);

      const button = <HTMLButtonElement>document.createElement("button");
      button.style.marginRight = "0.5em";
      button.textContent = SupClient.i18n.t("settingsEditors:Project.deleteTrashedAssetsFromDisk");
      vacuumContainer.appendChild(button);

      const span = <HTMLSpanElement>document.createElement("span");
      vacuumContainer.appendChild(span);

      button.addEventListener("click", (event) => {
        button.disabled = true;
        this.projectClient.socket.emit("vacuum:project", (err: string, deletedCount: number) => {
          button.disabled = false;
          if (err != null) { new SupClient.Dialogs.InfoDialog(err); return; }

          if (deletedCount > 0) {
            if (deletedCount > 1) span.textContent = SupClient.i18n.t("settingsEditors:Project.severalFoldersRemoved", { folders: deletedCount.toString() });
            else span.textContent = SupClient.i18n.t("settingsEditors:Project.oneFolderRemoved");
          } else span.textContent = SupClient.i18n.t("settingsEditors:Project.noFoldersRemoved");
        });
      });
    }

  }
}
