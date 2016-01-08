import FontAsset from "../data/FontAsset";

export default class TextRendererEditor {
  tbody: HTMLTableSectionElement;
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  fields: {[key: string]: any} = {};
  fontButtonElt: HTMLButtonElement;
  colorCheckbox: HTMLInputElement;
  colorPicker: HTMLInputElement;
  sizeRow: HTMLTableRowElement;
  sizeCheckbox: HTMLInputElement;

  fontAssetId: string;
  fontAsset: FontAsset;
  color: string;
  size: number;

  pendingModification = 0;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.tbody = tbody;
    this.editConfig = editConfig;
    this.projectClient = projectClient;

    this.fontAssetId = config.fontAssetId;
    this.color = config.color;
    this.size = config.size;

    let fontRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.font"));
    let fontFields = SupClient.table.appendAssetField(fontRow.valueCell, "");
    this.fields["fontAssetId"] = fontFields.textField;
    this.fields["fontAssetId"].addEventListener("input", this.onChangeFontAsset);
    this.fontButtonElt = fontFields.buttonElt;
    this.fontButtonElt.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.fontAssetId }, window.location.origin);
    });
    this.fontButtonElt.disabled = this.fontAssetId == null;

    let textRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.text"));
    this.fields["text"] = SupClient.table.appendTextAreaField(textRow.valueCell, config.text);
    this.fields["text"].addEventListener("input", (event: any) => {
      this.pendingModification += 1;
      this.editConfig("setProperty", "text", event.target.value, (err: string) => {
        this.pendingModification -= 1;
        if (err != null) { new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); return; }
      });
    });

    let alignmentRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.align.title"));
    let alignmentOptions: { [key: string]: string } = {
      "left": SupClient.i18n.t("componentEditors:TextRenderer.align.left"),
      "center": SupClient.i18n.t("componentEditors:TextRenderer.align.center"),
      "right": SupClient.i18n.t("componentEditors:TextRenderer.align.right")
    };
    this.fields["alignment"] = SupClient.table.appendSelectBox(alignmentRow.valueCell, alignmentOptions, config.alignment);
    this.fields["alignment"].addEventListener("change", (event: any) => { this.editConfig("setProperty", "alignment", event.target.value); });

    let verticalAlignmentRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.verticalAlign.title"));
    let verticalAlignmentOptions: { [key: string]: string } = {
      "top": SupClient.i18n.t("componentEditors:TextRenderer.verticalAlign.top"),
      "center": SupClient.i18n.t("componentEditors:TextRenderer.verticalAlign.center"),
      "bottom": SupClient.i18n.t("componentEditors:TextRenderer.verticalAlign.bottom")
    };
    this.fields["verticalAlignment"] = SupClient.table.appendSelectBox(verticalAlignmentRow.valueCell, verticalAlignmentOptions, config.verticalAlignment);
    this.fields["verticalAlignment"].addEventListener("change", (event: any) => { this.editConfig("setProperty", "verticalAlignment", event.target.value); });

    let colorRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.color"), { checkbox: true });
    this.colorCheckbox = colorRow.checkbox;
    this.colorCheckbox.addEventListener("change", (event) => {
      let color = this.colorCheckbox.checked ? (this.fontAsset != null ? this.fontAsset.pub.color : "ffffff") : null;
      this.editConfig("setProperty", "color", color);
    });

    let colorInputs = SupClient.table.appendColorField(colorRow.valueCell, "");
    this.fields["color"] = colorInputs.textField;
    this.fields["color"].addEventListener("input", (event: any) => {
      if (event.target.value.length !== 6) return;
      this.editConfig("setProperty", "color", event.target.value);
    });

    this.colorPicker = colorInputs.pickerField;
    this.colorPicker.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color", event.target.value.slice(1));
    });
    this.updateColorField();

    let sizeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.size"), { checkbox: true });
    this.sizeRow = sizeRow.row;
    this.sizeCheckbox = sizeRow.checkbox;
    this.sizeCheckbox.addEventListener("change", (event) => {
      let size = this.sizeCheckbox.checked ? (this.fontAsset != null ? this.fontAsset.pub.size : 16) : null;
      this.editConfig("setProperty", "size", size);
    });

    this.fields["size"] = SupClient.table.appendNumberField(sizeRow.valueCell, "", { min: 0 });
    this.fields["size"].addEventListener("input", (event: any) => {
      if (event.target.value === "") return;
      this.editConfig("setProperty", "size", parseInt(event.target.value, 10));
    });
    this.updateSizeField();

    this.projectClient.subEntries(this);
  }

  destroy() { this.projectClient.unsubEntries(this); }

  config_setProperty(path: string, value: any) {
    if (path === "fontAssetId") {
      if (this.fontAssetId != null) {
        this.projectClient.unsubAsset(this.fontAssetId, this);
        this.fontAsset = null;
      }
      this.fontAssetId = value;
      this.fontButtonElt.disabled = this.fontAssetId == null;

      this.updateColorField();

      if (this.fontAssetId != null) {
        this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(value);
        this.projectClient.subAsset(this.fontAssetId, "font", this);
      } else this.fields["fontAssetId"].value = "";

    } else if (path === "color") {
      this.color = value;
      this.updateColorField();

    } else if (path === "size") {
      this.size = value;
      this.updateSizeField();

    } else if (path === "text") {
      if (this.pendingModification === 0) this.fields["text"].value = value;
    } else this.fields[path].value = value;
  }

  private onChangeFontAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "fontAssetId", null);
    else {
      let entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "font") this.editConfig("setProperty", "fontAssetId", entry.id);
    }
  };

  private updateColorField() {
    let color = this.color != null ? this.color : (this.fontAsset != null ? this.fontAsset.pub.color : "");
    this.fields["color"].value = color;
    this.colorPicker.value = (color !== "") ? `#${color}` : "#000000";

    this.colorCheckbox.checked = this.color != null;
    this.fields["color"].disabled = this.color == null;
    this.colorPicker.disabled = this.color == null;
  }

  private updateSizeField() {
    if (this.fontAsset != null && this.fontAsset.pub.isBitmap) {
      this.sizeRow.hidden = true;
      return;
    } else this.sizeRow.hidden = false;

    let size = this.size != null ? this.size : (this.fontAsset != null ? this.fontAsset.pub.size : "");
    this.fields["size"].value = size;

    this.sizeCheckbox.checked = this.size != null;
    this.fields["size"].disabled = this.size == null;
  }

  // Network callbacks
  onEntriesReceived(entries: SupCore.Data.Entries) {
    if (entries.byId[this.fontAssetId] != null) {
      this.fields["fontAssetId"].value = entries.getPathFromId(this.fontAssetId);
      this.projectClient.subAsset(this.fontAssetId, "sprite", this);
    }
  }
  onEntryAdded(entry: any, parentId: string, index: number) { /* Nothing to do here */ }
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id === this.fontAssetId) this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(this.fontAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id === this.fontAssetId) this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(this.fontAssetId);
  }
  onEntryTrashed(id: string) { /* Nothing to do here */ }

  onAssetReceived(assetId: string, asset: FontAsset) {
    this.fontAsset = asset;

    this.updateColorField();
    this.updateSizeField();
  }
  onAssetEdited(assetId: string, command: string, ...args: any[]) {
    if (command !== "setProperty") return;

    if (command === "setProperty" && args[0] === "color") this.updateColorField();
    if (command === "setProperty" && (args[0] === "size" || args[0] === "isBitmap")) this.updateSizeField();
  }
  onAssetTrashed(assetId: string) {
    this.fontAsset = null;

    this.fields["fontAssetId"].value = "";
    this.updateColorField();
    this.updateSizeField();
  }
}
