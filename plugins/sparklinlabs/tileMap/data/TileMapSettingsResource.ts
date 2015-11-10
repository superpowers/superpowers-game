import * as path from "path";
import * as fs from "fs";

interface TileMapSettingsResourcePub {
  formatVersion: number;

  pixelsPerUnit: number;
  width: number;
  height: number;
  layerDepthOffset: number;

  grid: { width: number; height: number; };
}

export default class TileMapSettingsResource extends SupCore.data.base.Resource {
  static currentFormatVersion = 1;

  static schema: SupCore.data.base.Schema = {
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

  constructor(pub: TileMapSettingsResourcePub, serverData: any) {
    super(pub, TileMapSettingsResource.schema, serverData);
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

  migrate(resourcePath: string, callback: (hasMigrated: boolean) => void) {
    if (this.pub.formatVersion === TileMapSettingsResource.currentFormatVersion) { callback(false); return; }

    if (this.pub.formatVersion == null) {
      // NOTE: gridSize was renamed to grid.width and .height in Superpowers 0.8
      if ((<any>this.pub)["gridSize"] != null) {
        this.pub.grid = { width: (<any>this.pub)["gridSize"], height: (<any>this.pub)["gridSize"] };
        delete (<any>this.pub)["gridSize"];
      }

      this.pub.formatVersion = 1;
    }

    callback(true);
  }
}
