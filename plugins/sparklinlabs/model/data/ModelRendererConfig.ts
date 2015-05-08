export interface ModelRendererConfigPub {
  modelAssetId: string;
  animationId: string;
  castShadow: boolean;
  receiveShadow: boolean;
}

export default class ModelRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    modelAssetId: { type: "string?", min: 0, mutable: true },
    animationId: { type: "string?", min: 0, mutable: true },
    castShadow: { type: "boolean", mutable: true },
    receiveShadow: { type: "boolean", mutable: true }
  }

  static create() {
    let emptyConfig: ModelRendererConfigPub = { modelAssetId: null, animationId: null, castShadow: false, receiveShadow: false };
    return emptyConfig;
  }

  constructor(pub: ModelRendererConfigPub) {
    // TODO: Remove these at some point, new config setting introduced in Superpowers 0.6
    if (pub.castShadow == null) pub.castShadow = false;
    if (pub.receiveShadow == null) pub.receiveShadow = false;

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
