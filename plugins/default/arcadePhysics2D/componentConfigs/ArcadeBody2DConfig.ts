export interface ConfigPub {
  type: string;

  movable: boolean;
  width: number;
  height: number;
  offset: { x: number; y: number; };

  tileMapAssetId: string;
  tileSetPropertyName: string;
  layersIndex: string;
}

export default class ArcadeBody2DConfig extends SupCore.Data.Base.ComponentConfig {

  static schema = {
    type: { type: "enum", items: ["box", "tileMap"], mutable: true },

    // Box
    movable: { type: "boolean", mutable: true },
    width: { type: "number", mutable: true },
    height: { type: "number", mutable: true },
    offset: {
      type: "hash",
      properties: {
        x: { type: "number", mutable: true },
        y: { type: "number", mutable: true },
      }
    },

    // TileMap
    tileMapAssetId: { type: "string?", mutable: true },
    tileSetPropertyName: { type: "string?", mutable: true },
    layersIndex: { type: "string?", min: 0, mutable: true },
  };

  static create() {
    let newConfig: ConfigPub = {
      type: "box",

      movable: true,
      width: 1,
      height: 1,
      offset: { x: 0, y: 0 },

      tileMapAssetId: null,
      tileSetPropertyName: null,
      layersIndex: null,
    };
    return newConfig;
  }

  pub: ConfigPub;

  constructor(pub: any) {
    super(pub, ArcadeBody2DConfig.schema);

    // Migration v0.12.0
    if (this.pub.offset == null) {
      this.pub.offset = { x: (<any>this.pub).offsetX, y: (<any>this.pub).offsetY };
      delete (<any>this.pub).offsetX;
      delete (<any>this.pub).offsetY;
    }

    if (this.pub.tileMapAssetId === "") this.pub.tileMapAssetId = null;

    // Migration v0.6.0
    if (this.pub.type == null) {
      this.pub.type = "box";
      this.pub.tileMapAssetId = null;
      this.pub.tileSetPropertyName = null;
      this.pub.layersIndex = null;
    }
  }
}
