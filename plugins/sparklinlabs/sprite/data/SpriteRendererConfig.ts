export default class SpriteRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    spriteAssetId: { type: "string?", min: 0, mutable: true },
    animationId: { type: "string?", min: 0, mutable: true }
  }

  static create() {
    let emptyConfig: { spriteAssetId: string; animationId: string; } = { spriteAssetId: null, animationId: null };
    return emptyConfig;
  }

  constructor(pub: any) {
    // TODO: Remove these casts at some point, legacy stuff from Superpowers 0.4
    if (typeof pub.spriteAssetId === "number") pub.spriteAssetId = pub.spriteAssetId.toString();
    if (typeof pub.animationId === "number") pub.animationId = pub.animationId.toString();

    super(pub, SpriteRendererConfig.schema);
  }

  restore() { if (this.pub.spriteAssetId != null) this.emit("addDependencies", [ this.pub.spriteAssetId ]); }
  destroy() { if (this.pub.spriteAssetId != null) this.emit("removeDependencies", [ this.pub.spriteAssetId ]); }

  setProperty(path: string, value: any, callback: (err: string, actualValue?: any) => any) {
    let oldDepId: string;
    if (path === "spriteAssetId") oldDepId = this.pub[path];

    super.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      if (path === "spriteAssetId") {
        if (oldDepId != null) this.emit("removeDependencies", [ oldDepId ]);
        if (actualValue != null) this.emit("addDependencies", [ actualValue ]);
      }

      callback(null, actualValue);
    });
  }
}
