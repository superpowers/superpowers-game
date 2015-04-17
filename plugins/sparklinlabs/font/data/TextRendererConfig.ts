class TextRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    fontAssetId: { type: "string?", min: 0, mutable: true },
    text: { type: "string", min: 0, mutable: true },
    align: { type: "enum", items: [ "left", "center", "right"], mutable: true },
    size: { type: "integer?", min: 0, mutable: true },
    color: { type: "string?", min: 0, mutable: true }
  }

  static create() {
    var emptyConfig: any = {
      fontAssetId: null,
      text: "Text",
      align: "center",
      size: null,
      color: null
    };
    return emptyConfig;
  }

  constructor(pub: any) {
    super(pub, TextRendererConfig.schema);
  }
}
export = TextRendererConfig;
