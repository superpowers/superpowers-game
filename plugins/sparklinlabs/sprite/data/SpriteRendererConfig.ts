class SpriteRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    spriteAssetId: { type: "integer?", min: 0, mutable: true },
    animationId: { type: "integer?", min: 0, mutable: true }
  }

  static create() {
    var emptyConfig: {spriteAssetId: string; animationId: string;} = { spriteAssetId: null, animationId: null };
    return emptyConfig;
  }

  constructor(pub: any) { super(pub, SpriteRendererConfig.schema); }
  restore() { if (this.pub.spriteAssetId != null) this.emit("addDependencies", [ this.pub.spriteAssetId ]); }
  destroy() { if (this.pub.spriteAssetId != null) this.emit("removeDependencies", [ this.pub.spriteAssetId ]); }

  setProperty(path: string, value: any, callback: (err: string, actualValue?: any) => any) {
    var oldDepId: string;
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
export = SpriteRendererConfig;
