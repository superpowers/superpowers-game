export default class ModelRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    modelAssetId: { type: "string?", min: 0, mutable: true },
    animationId: { type: "string?", min: 0, mutable: true }
  }

  static create() {
    let emptyConfig: { modelAssetId: string; animationId: string; } = { modelAssetId: null, animationId: null };
    return emptyConfig;
  }

  constructor(pub: any) {
    // TODO: Remove these casts at some point, legacy stuff from Superpowers 0.4
    if (typeof pub.modelAssetId === "number") pub.modelAssetId = pub.modelAssetId.toString();
    if (typeof pub.animationId === "number") pub.animationId = pub.animationId.toString();

    super(pub, ModelRendererConfig.schema);
  }

  restore() { if (this.pub.modelAssetId != null) this.emit("addDependencies", [ this.pub.modelAssetId ]); }
  destroy() { if (this.pub.modelAssetId != null) this.emit("removeDependencies", [ this.pub.modelAssetId ]); }

  setProperty(path: string, value: any, callback: (err: string, actualValue?: any) => any) {
    let oldDepId: string;
    if (path === "modelAssetId") oldDepId = this.pub[path];

    super.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      if (path === "modelAssetId") {
        if (oldDepId != null) this.emit("removeDependencies", [ oldDepId ]);
        if (actualValue != null) this.emit("addDependencies", [ actualValue ]);
      }

      callback(null, actualValue);
    });
  }
}
