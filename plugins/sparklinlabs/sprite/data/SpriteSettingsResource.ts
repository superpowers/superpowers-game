import path = require("path");
import fs = require("fs");

class SpriteSettingsResource extends SupCore.data.base.Resource {

  static schema = {
    filtering: { type: "enum", items: [ "pixelated", "smooth" ], mutable: true },
    pixelsPerUnit: { type: "number", min: 1, mutable: true },
    framesPerSecond: { type: "number", min: 1, mutable: true },
    alphaTest: { type: "number", min: 0, max: 1, mutable: true }
  }

  constructor(pub: any, serverData: any) {
    super(pub, SpriteSettingsResource.schema, serverData);
  }

  setup() {}

  init(callback: Function) {
    this.pub = {
      filtering: "pixelated",
      pixelsPerUnit: 100,
      framesPerSecond: 10,
      alphaTest: 0.1
    }

    super.init(callback);
  }
}
export = SpriteSettingsResource;
