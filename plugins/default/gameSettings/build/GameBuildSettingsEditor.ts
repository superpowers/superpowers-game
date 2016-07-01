import * as TreeView from "dnd-tree-view";

let outputFolder: string;

export default class GameBuildSettingsEditor implements SupClient.BuildSettingsEditor {
  private outputFolder = outputFolder;
  private outputFolderTextfield: HTMLInputElement;
  private outputFolderButton: HTMLButtonElement;

  private table: HTMLTableElement;

  constructor(container: HTMLDivElement, private entries: SupCore.Data.Entries, private entriesTreeView: TreeView) {
    const { table, tbody } = SupClient.table.createTable(container);
    this.table = table;
    table.classList.add("properties");
    table.hidden = true;

    {
      const row = SupClient.table.appendRow(tbody, SupClient.i18n.t("buildSettingsEditors:game.outputFolder"));
      const inputs = SupClient.html("div", "inputs", { parent: row.valueCell });

      const value = this.outputFolder != null ? this.outputFolder : "";
      this.outputFolderTextfield = SupClient.html("input", { parent: inputs, type: "text", value, readOnly: true, style: { cursor: "pointer" } }) as HTMLInputElement;
      this.outputFolderButton = SupClient.html("button", { parent: inputs, textContent: SupClient.i18n.t("common:actions.select") }) as HTMLButtonElement;

      this.outputFolderTextfield.addEventListener("click", (event) => { event.preventDefault(); this.selectOutputfolder(); });
      this.outputFolderButton.addEventListener("click", (event) => { event.preventDefault(); this.selectOutputfolder(); });
    }
  }

  setVisible(visible: boolean) {
    this.table.hidden = !visible;
  }

  getSettings(): GameBuildSettings {
    return { outputFolder: this.outputFolder };
  }

  private selectOutputfolder() {
    SupApp.chooseFolder((folder) => {
      this.outputFolder = folder;
      this.outputFolderTextfield.value = (folder != null) ? folder : "";
    });
  }
}
