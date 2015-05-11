export default class TextRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    fontAssetId: { type: "string?", min: 0, mutable: true },
    text: { type: "string", min: 0, mutable: true },
    alignment: { type: "enum", items: [ "left", "center", "right" ], mutable: true },
    verticalAlignment: { type: "enum", items: [ "top", "center", "bottom" ], mutable: true },
    size: { type: "integer?", min: 0, mutable: true },
    color: { type: "string?", min: 0, mutable: true }
  }

  static create() {
    let emptyConfig: any = {
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
    if (pub.verticalAlignment == null) pub.verticalAlignment = "center";

    super(pub, TextRendererConfig.schema);
  }
}
