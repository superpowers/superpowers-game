export default class TextRendererEditor {
  projectClient: SupClient.ProjectClient;
  editConfig: any;

  fields: {[key: string]: any} = {};
  fontButtonElt: HTMLButtonElement;
  colorPicker: HTMLInputElement;
  fontAssetId: string;

  pendingModification = 0;

  constructor(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any) {
    this.editConfig = editConfig;
    this.projectClient = projectClient;
    this.fontAssetId = config.fontAssetId;

    let fontRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.font"));
    let fontName = (config.fontAssetId != null) ? this.projectClient.entries.getPathFromId(this.fontAssetId) : "";
    let fontFields = SupClient.table.appendAssetField(fontRow.valueCell, fontName);
    this.fields["fontAssetId"] = fontFields.textField;
    this.fields["fontAssetId"].addEventListener("input", this.onChangeFontAsset);
    this.fontButtonElt = fontFields.buttonElt;
    this.fontButtonElt.addEventListener("click", (event) => {
      window.parent.postMessage({ type: "openEntry", id: this.fontAssetId }, (<any>window.location).origin);
    });
    this.fontButtonElt.disabled = this.fontAssetId == null;

    let textRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.text"));
    this.fields["text"] = SupClient.table.appendTextAreaField(textRow.valueCell, config.text);
    this.fields["text"].addEventListener("input", (event: any) => {
      this.pendingModification += 1;
      this.editConfig("setProperty", "text", event.target.value, (err: string) => {
        this.pendingModification -= 1;
        if (err != null) { alert(err); return; }
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

    let sizeRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.size"));
    this.fields["size"] = SupClient.table.appendNumberField(sizeRow.valueCell, config.size, 0);
    this.fields["size"].addEventListener("change", (event: any) => {
      let size = (event.target.value !== "") ? parseInt(event.target.value, 10) : null;
      this.editConfig("setProperty", "size", size);
    });

    let colorRow = SupClient.table.appendRow(tbody, SupClient.i18n.t("componentEditors:TextRenderer.color"));
    let colorInputs = SupClient.table.appendColorField(colorRow.valueCell, config.color);

    this.fields["color"] = colorInputs.textField;
    this.fields["color"].addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color", event.target.value);
    });

    this.colorPicker = colorInputs.pickerField;
    this.colorPicker.addEventListener("change", (event: any) => {
      this.editConfig("setProperty", "color", event.target.value.slice(1));
    });

    this.projectClient.subEntries(this);
  }

  destroy() { this.projectClient.unsubEntries(this); }

  config_setProperty(path: string, value: any) {
    if (path === "fontAssetId") {
      this.fontAssetId = value;
      this.fontButtonElt.disabled = this.fontAssetId == null;
      if (value != null) this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(value);
      else this.fields["fontAssetId"].value = "";
    } else if (path === "color") {
      this.fields["color"].value = value;
      this.colorPicker.value = (value != null) ? `#${value}` : "#ffffff";
    } else if (path === "text") {
      if (this.pendingModification === 0) this.fields["text"].value = value;
    } else this.fields[path].value = value;
  }

  private onChangeFontAsset = (event: any) => {
    if (event.target.value === "") this.editConfig("setProperty", "fontAssetId", null);
    else {
      let  entry = SupClient.findEntryByPath(this.projectClient.entries.pub, event.target.value);
      if (entry != null && entry.type === "font") this.editConfig("setProperty", "fontAssetId", entry.id);
    }
  };

  // Network callbacks
  onEntriesReceived(entries: SupCore.Data.Entries) { /* Nothing to do here */ }
  onEntryAdded(entry: any, parentId: string, index: number) { /* Nothing to do here */ }
  onEntryMoved(id: string, parentId: string, index: number) {
    if (id === this.fontAssetId) this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(this.fontAssetId);
  }
  onSetEntryProperty(id: string, key: string, value: any) {
    if (id === this.fontAssetId) this.fields["fontAssetId"].value = this.projectClient.entries.getPathFromId(this.fontAssetId);
  }
  onEntryTrashed(id: string) { /* Nothing to do here */ }
}
