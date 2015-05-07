interface TileMapSettingsResourcePub {
  pixelsPerUnit: number;
  width: number;
  height: number;
  layerDepthOffset: number;

  gridSize: number;
}

export default class TileMapSettingsResource extends SupCore.data.base.Resource {

  static schema = {
    pixelsPerUnit: { type: "integer", min: 1, mutable: true },
    width: { type: "integer", min: 1, mutable: true },
    height: { type: "integer", min: 1, mutable: true },
    layerDepthOffset: { type: "number", min: 0, mutable: true },

    gridSize: { type: "integer", min: 1, mutable: true }
  };

  pub: TileMapSettingsResourcePub;

  constructor(pub: TileMapSettingsResourcePub, serverData: any) {
    super(pub, TileMapSettingsResource.schema, serverData);
  }

  setup() {}

  init(callback: Function) {
    this.pub = {
      pixelsPerUnit: 100,
      width: 30,
      height: 20,
      layerDepthOffset: 1,

      gridSize: 40
    };

    super.init(callback);
  }
}
