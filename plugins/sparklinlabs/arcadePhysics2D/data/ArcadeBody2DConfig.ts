export interface ConfigPub {
  type: string;

  movable: boolean;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;

  tileMapAssetId: string;
  tileSetPropertyName: string;
  layersIndex: string;
}

export default class ArcadeBody2DConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    type: { type: "enum", items: ["box", "tileMap"], mutable: true },

    // Box
    movable: { type: "boolean", mutable: true },
    width: { type: "number", mutable: true },
    height: { type: "number", mutable: true },
    offsetX: { type: "number", mutable: true },
    offsetY: { type: "number", mutable: true },

    // TileMap
    tileMapAssetId: { type: "string", mutable: true },
    tileSetPropertyName: { type: "string", mutable: true },
    layersIndex: { type: "string?", min: 0, mutable: true },
  }

  static create() {
    let newConfig: ConfigPub = {
      type: "box",

      movable: true,
      width: 1,
      height: 1,
      offsetX: 0,
      offsetY: 0,

      tileMapAssetId: "",
      tileSetPropertyName: "solid",
      layersIndex: null,
    }
    return newConfig;
  }

  pub: ConfigPub;

  constructor(pub: any) {
    super(pub, ArcadeBody2DConfig.schema);

    // Migration v0.6.0
    if (this.pub.type == null) {
      this.pub.type = "box";
      this.pub.tileMapAssetId = "";
      this.pub.tileSetPropertyName = "solid";
      this.pub.layersIndex = null;
    }
  }
}
