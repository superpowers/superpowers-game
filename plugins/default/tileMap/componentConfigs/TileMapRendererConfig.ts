export interface TileMapRendererConfigPub {
  formatVersion?: number;

  tileMapAssetId: string;
  tileSetAssetId: string;

  castShadow?: boolean;
  receiveShadow?: boolean;

  materialType: string;
  shaderAssetId?: string;
}

export default class TileMapRendererConfig extends SupCore.Data.Base.ComponentConfig {

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    tileMapAssetId: { type: "string?", min: 0, mutable: true },
    tileSetAssetId: { type: "string?", min: 0, mutable: true },
    castShadow: { type: "boolean", mutable: true },
    receiveShadow: { type: "boolean", mutable: true },
    materialType: { type: "enum", items: ["basic", "phong", "shader"], mutable: true },
    shaderAssetId: { type: "string?", min: 0, mutable: true }
  };

  static create() {
    let newConfig: TileMapRendererConfigPub = {
      formatVersion: TileMapRendererConfig.currentFormatVersion,

      tileMapAssetId: null, tileSetAssetId: null,
      castShadow: false, receiveShadow: false,
      materialType: "basic", shaderAssetId: null
    };
    return newConfig;
  }

  static currentFormatVersion = 1;
  static migrate(pub: TileMapRendererConfigPub) {
    if (pub.formatVersion === TileMapRendererConfig.currentFormatVersion) return false;

    if (pub.formatVersion == null) {
      pub.formatVersion = 1;

      // NOTE: Legacy stuff from Superpowers 0.4
      if (typeof pub.tileMapAssetId === "number") pub.tileMapAssetId = pub.tileMapAssetId.toString();
      if (typeof pub.tileSetAssetId === "number") pub.tileSetAssetId = pub.tileSetAssetId.toString();

      // NOTE: Legacy stuff from Superpowers 0.11
      if (pub.castShadow == null) pub.castShadow = false;
      if (pub.receiveShadow == null) pub.receiveShadow = false;
      if (pub.materialType == null) pub.materialType = "basic";
    }

    return true;
  }

  pub: TileMapRendererConfigPub;

  constructor(pub: TileMapRendererConfigPub) { super(pub, TileMapRendererConfig.schema); }

  restore() {
    if (this.pub.tileMapAssetId != null) this.emit("addDependencies", [ this.pub.tileMapAssetId ]);
    if (this.pub.tileSetAssetId != null) this.emit("addDependencies", [ this.pub.tileSetAssetId ]);
  }

  destroy() {
    if (this.pub.tileMapAssetId != null) this.emit("removeDependencies", [ this.pub.tileMapAssetId ]);
    if (this.pub.tileSetAssetId != null) this.emit("removeDependencies", [ this.pub.tileSetAssetId ]);
  }

  setProperty(path: string, value: any, callback: (err: string, value: any) => any) {
    let oldDepId: string;
    if (path === "tileMapAssetId") oldDepId = this.pub.tileMapAssetId;
    if (path === "tileSetAssetId") oldDepId = this.pub.tileSetAssetId;

    super.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err, null); return; }

      if (path === "tileMapAssetId" || path === "tileSetAssetId") {
        if (oldDepId != null) this.emit("removeDependencies", [ oldDepId ]);
        if (actualValue != null) this.emit("addDependencies", [ actualValue ]);
      }

      callback(null, actualValue);
    });
  }
}
