export interface SpriteRendererConfigPub {
  spriteAssetId: string;
  animationId: string;
  horizontalFlip: boolean;
  verticalFlip: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  color: string;
  overrideOpacity: boolean;
  opacity: number;
  materialType: string;
}

export default class SpriteRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    spriteAssetId: { type: "string?", min: 0, mutable: true },
    animationId: { type: "string?", min: 0, mutable: true },
    horizontalFlip: { type: "boolean", mutable: true },
    verticalFlip: { type: "boolean", mutable: true },
    castShadow: { type: "boolean", mutable: true },
    receiveShadow: { type: "boolean", mutable: true },
    color: { type: "string?", length: 6, mutable: true },
    overrideOpacity: { type: "boolean", mutable: true },
    opacity: { type: "number?", min: 0, max: 1, mutable: true },
    materialType: { type: "enum", items: ["basic", "phong", "shader"], mutable: true }
  }

  static create() {
    let emptyConfig: SpriteRendererConfigPub = {
      spriteAssetId: null,
      animationId: null,
      horizontalFlip: false,
      verticalFlip: false,
      castShadow: false,
      receiveShadow: false,
      overrideOpacity: false,
      opacity: null,
      color: "ffffff",
      materialType: "basic"
    };
    return emptyConfig;
  }

  constructor(pub: SpriteRendererConfigPub) {
    // TODO: Remove these at some point, new config setting introduced in Superpowers 0.8
    if (pub.overrideOpacity == null) pub.overrideOpacity = false;
    if (pub.color == null) pub.color = "ffffff";
    if (pub.horizontalFlip == null) pub.horizontalFlip = false;
    if (pub.verticalFlip == null) pub.verticalFlip = false;

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

      if (path === "overrideOpacity") this.pub.opacity = null;

      callback(null, actualValue);
    });
  }
}
