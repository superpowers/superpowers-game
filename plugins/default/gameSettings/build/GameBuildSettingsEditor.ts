import * as TreeView from "dnd-tree-view";

let savedSettings = {
  outputFolder: ""
};

const settingsStorageKey = "superpowers.build.game";
const settingsJSON = window.localStorage.getItem(settingsStorageKey);
if (settingsJSON != null) {
  const parsedSettings = JSON.parse(settingsJSON);
  if (savedSettings != null && typeof savedSettings === "object") savedSettings = parsedSettings;
}

export default class GameBuildSettingsEditor implements SupClient.BuildSettingsEditor {
  private outputFolderTextfield: HTMLInputElement;
  private outputFolderButton: HTMLButtonElement;
  private errorRowElt: HTMLTableRowElement;
  private errorInput: HTMLInputElement;

  private table: HTMLTableElement;

  constructor(container: HTMLDivElement, private entries: SupCore.Data.Entries, private entriesTreeView: TreeView) {
    const { table, tbody } = SupClient.table.createTable(container);
    this.table = table;
    table.classList.add("properties");
    table.hidden = true;

    const outputFolderRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("buildSettingsEditors:game.outputFolder"));
    const inputs = SupClient.html("div", "inputs", { parent: outputFolderRow.valueCell });

    const value = savedSettings.outputFolder != null ? savedSettings.outputFolder : "";
    this.outputFolderTextfield = SupClient.html("input", { parent: inputs, type: "text", value, readOnly: true, style: { cursor: "pointer" } }) as HTMLInputElement;
    this.outputFolderButton = SupClient.html("button", { parent: inputs, textContent: SupClient.i18n.t("common:actions.select") }) as HTMLButtonElement;

    this.outputFolderTextfield.addEventListener("click", (event) => { event.preventDefault(); this.selectOutputfolder(); });
    this.outputFolderButton.addEventListener("click", (event) => { event.preventDefault(); this.selectOutputfolder(); });

    const errorRow = SupClient.table.appendRow(tbody, "Error");
    this.errorRowElt = errorRow.row;
    this.errorRowElt.hidden = true;
    this.errorInput = SupClient.html("input", { parent: errorRow.valueCell, type: "text", readOnly: true }) as HTMLInputElement;
  }

  setVisible(visible: boolean) {
    this.table.hidden = !visible;
  }

  getSettings(callback: (settings: GameBuildSettings) => void) {
    this.ensureOutputFolderValid((outputFolderValid) => {
      callback(outputFolderValid ? { outputFolder: savedSettings.outputFolder } : null);
    });
  }

  private selectOutputfolder() {
    SupApp.chooseFolder((folderPath) => {
      if (folderPath == null) return;

      savedSettings.outputFolder = this.outputFolderTextfield.value = folderPath;
      window.localStorage.setItem(settingsStorageKey, JSON.stringify(savedSettings));

      this.ensureOutputFolderValid();
    });
  }

  private ensureOutputFolderValid(callback?: (outputFolderValid: boolean) => void) {
    if (savedSettings.outputFolder == null) {
      this.displayError(SupClient.i18n.t("buildSettingsEditors:game.errors.selectDestionationFolder"));
      if (callback != null) callback(false);
      return;
    }

    SupApp.readDir(savedSettings.outputFolder, (err, files) => {
      if (err != null) {
        this.displayError(SupClient.i18n.t("buildSettingsEditors:game.errors.emptyDirectoryCheckFail"));
        console.log(err);
        if (callback != null) callback(false);
        return;
      }

      let index = 0;
      while (index < files.length) {
        const item = files[index];
        if (item[0] === "." || item === "Thumbs.db") files.splice(index, 1);
        else index++;
      }

      if (files.length > 0) {
        this.displayError(SupClient.i18n.t("buildSettingsEditors:game.errors.destinationFolderEmpty"));
        if (callback != null) callback(false);
      } else {
        this.errorRowElt.hidden = true;
        if (callback != null) callback(true);
      }
    });
  }

  private displayError(err: string) {
    this.errorRowElt.hidden = false;
    this.errorInput.value = err;

    (this.errorRowElt as any).animate([
      { transform: "translateX(0)" },
      { transform: "translateX(1.5vh)" },
      { transform: "translateX(0)" }
    ], { duration: 100 });
  }
}
