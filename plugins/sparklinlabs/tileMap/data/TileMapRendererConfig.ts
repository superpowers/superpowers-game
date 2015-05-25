interface TileMapRendererConfigPub {
  tileMapAssetId: string;
  tileSetAssetId: string;
}

export default class TileMapRendererConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    tileMapAssetId: { type: "string?", min: 0, mutable: true },
    tileSetAssetId: { type: "string?", min: 0, mutable: true }
  };

  static create() {
    let newConfig: TileMapRendererConfigPub = {
      tileMapAssetId: null,
      tileSetAssetId: null
    }
    return newConfig;
  };

  pub: TileMapRendererConfigPub;

  constructor(pub: TileMapRendererConfigPub) {
    // TODO: Remove these casts at some point, legacy stuff from Superpowers 0.4
    if (typeof pub.tileMapAssetId === "number") pub.tileMapAssetId = pub.tileMapAssetId.toString();
    if (typeof pub.tileSetAssetId === "number") pub.tileSetAssetId = pub.tileSetAssetId.toString();

    super(pub, TileMapRendererConfig.schema);
  }

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
