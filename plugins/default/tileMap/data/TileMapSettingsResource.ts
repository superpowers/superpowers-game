interface TileMapSettingsResourcePub {
  formatVersion: number;

  pixelsPerUnit: number;
  width: number;
  height: number;
  layerDepthOffset: number;

  grid: { width: number; height: number; };
}

export default class TileMapSettingsResource extends SupCore.Data.Base.Resource {
  static currentFormatVersion = 1;

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    pixelsPerUnit: { type: "integer", minExcluded: 0, mutable: true },
    width: { type: "integer", min: 1, mutable: true },
    height: { type: "integer", min: 1, mutable: true },
    layerDepthOffset: { type: "number", min: 0, mutable: true },

    grid: {
      type: "hash",
      properties: {
        width: { type: "integer", min: 1, mutable: true },
        height: { type: "integer", min: 1, mutable: true }
      }
    }
  };

  pub: TileMapSettingsResourcePub;

  constructor(id: string, pub: TileMapSettingsResourcePub, server: ProjectServer) {
    super(id, pub, TileMapSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      formatVersion: TileMapSettingsResource.currentFormatVersion,

      pixelsPerUnit: 100,
      width: 30,
      height: 20,
      layerDepthOffset: 1,

      grid: {
        width: 40,
        height: 40
      }
    };

    super.init(callback);
  }

  migrate(resourcePath: string, pub: TileMapSettingsResourcePub, callback: (hasMigrated: boolean) => void) {
    if (pub.formatVersion === TileMapSettingsResource.currentFormatVersion) { callback(false); return; }

    if (pub.formatVersion == null) {
      // NOTE: gridSize was renamed to grid.width and .height in Superpowers 0.8
      if ((<any>pub)["gridSize"] != null) {
        pub.grid = { width: (<any>pub)["gridSize"], height: (<any>pub)["gridSize"] };
        delete (<any>pub)["gridSize"];
      }

      pub.formatVersion = 1;
    }

    callback(true);
  }
}
