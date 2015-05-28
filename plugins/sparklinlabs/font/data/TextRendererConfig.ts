export default class TextRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    fontAssetId: { type: "string?", min: 0, mutable: true },
    text: { type: "string", min: 0, mutable: true },
    alignment: { type: "enum", items: [ "left", "center", "right" ], mutable: true },
    verticalAlignment: { type: "enum", items: [ "top", "center", "bottom" ], mutable: true },
    size: { type: "integer?", min: 0, mutable: true },
    color: { type: "string?", length: 6, mutable: true }
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
    // TODO: Remove these casts at some point, legacy stuff from Superpowers 0.7
    if (pub.color != null && pub.color.length !== 6) pub.color = "ffffff";

    // Migrate from old "align" property
    if (pub.align != null) {
      pub.alignment = pub.align;
      delete pub.align;
    }
    if (pub.verticalAlignment == null) pub.verticalAlignment = "center";

    super(pub, TextRendererConfig.schema);
  }

  restore() { if (this.pub.fontAssetId != null) this.emit("addDependencies", [ this.pub.fontAssetId ]); }
  destroy() { if (this.pub.fontAssetId != null) this.emit("removeDependencies", [ this.pub.fontAssetId ]); }

  setProperty(path: string, value: any, callback: (err: string, actualValue?: any) => any) {
    let oldDepId: string;
    if (path === "fontAssetId") oldDepId = this.pub[path];

    super.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      if (path === "fontAssetId") {
        if (oldDepId != null) this.emit("removeDependencies", [ oldDepId ]);
        if (actualValue != null) this.emit("addDependencies", [ actualValue ]);
      }

      callback(null, actualValue);
    });
  }
}
