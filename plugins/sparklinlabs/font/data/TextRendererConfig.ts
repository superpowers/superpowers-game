class TextRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    fontAssetId: { type: "string?", min: 0, mutable: true },
    text: { type: "string", min: 0, mutable: true },
    alignment: { type: "enum", items: [ "left", "center", "right" ], mutable: true },
    size: { type: "integer?", min: 0, mutable: true },
    color: { type: "string?", min: 0, mutable: true }
  }

  static create() {
    var emptyConfig: any = {
      fontAssetId: null,
      text: "Text",
      alignment: "center",
      size: null,
      color: null
    };
    return emptyConfig;
  }

  constructor(pub: any) {
    // Migrate from old "align" property
    if (pub.align != null) {
      pub.alignment = pub.align;
      delete pub.align;
    }

    super(pub, TextRendererConfig.schema);
  }
}
export = TextRendererConfig;
