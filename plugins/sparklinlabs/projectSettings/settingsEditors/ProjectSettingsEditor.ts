import ProjectSettingsResource from "../data/ProjectSettingsResource";

export default class ProjectSettingsEditor {

  projectClient: SupClient.ProjectClient;
  resource: ProjectSettingsResource;

  fields: { [name: string]: HTMLInputElement } = {};

  constructor(container: HTMLDivElement, projectClient: SupClient.ProjectClient) {
    this.projectClient = projectClient;

    // Vacuum
    {
      let vacuumContainer = <HTMLDivElement>document.createElement("div");
      container.appendChild(vacuumContainer);

      let button = <HTMLButtonElement>document.createElement("button");
      button.style.marginRight = "0.5em";
      button.textContent = "Delete trashed assets from disk";
      vacuumContainer.appendChild(button);

      let span = <HTMLSpanElement>document.createElement("span");
      vacuumContainer.appendChild(span);

      button.addEventListener("click", (event) => {
        button.disabled = true;
        this.projectClient.socket.emit("vacuum:project", (err: string, deletedCount: number) => {
          button.disabled = false;
          if (err != null) { alert(err); return; }

          if (deletedCount > 0) {
            if (deletedCount > 1) span.textContent = `${deletedCount} folders were removed.`;
            else span.textContent = "1 folder was removed.";
          } else span.textContent = "No folder were removed.";
        });
      });
    }

  }
}
