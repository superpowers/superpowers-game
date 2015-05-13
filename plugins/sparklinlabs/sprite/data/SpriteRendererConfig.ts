export interface SpriteRendererConfigPub {
  spriteAssetId: string;
  animationId: string;
  castShadow: boolean;
  receiveShadow: boolean;
  materialType: string;
}

export default class SpriteRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    spriteAssetId: { type: "string?", min: 0, mutable: true },
    animationId: { type: "string?", min: 0, mutable: true },
    castShadow: { type: "boolean", mutable: true },
    receiveShadow: { type: "boolean", mutable: true },
    materialType: { type: "enum", items: ["basic", "phong", "shader"], mutable: true }
  }

  static create() {
    let emptyConfig: SpriteRendererConfigPub = {
      spriteAssetId: null,
      animationId: null,
      castShadow: false,
      receiveShadow: false,
      materialType: "basic"
    };
    return emptyConfig;
  }

  constructor(pub: SpriteRendererConfigPub) {
    // TODO: Remove these at some point, new config setting introduced in Superpowers 0.7
    if (pub.castShadow == null) pub.castShadow = false;
    if (pub.receiveShadow == null) pub.receiveShadow = false;
    if (pub.materialType == null) pub.materialType = "basic";

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
