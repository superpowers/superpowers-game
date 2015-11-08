import * as path from "path";
import * as fs from "fs";

export default class CubicModelSettingsResource extends SupCore.Data.Base.Resource {

  static schema: SupCore.Data.Base.Schema = {
    pixelsPerUnit: { type: "integer", min: 1, mutable: true }
  }

  constructor(pub: any, server: ProjectServer) {
    super(pub, CubicModelSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      pixelsPerUnit: 16
    };

    super.init(callback);
  }
}
