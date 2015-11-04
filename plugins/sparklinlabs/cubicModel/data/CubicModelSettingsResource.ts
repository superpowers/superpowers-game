import * as path from "path";
import * as fs from "fs";

export default class CubicModelSettingsResource extends SupCore.data.base.Resource {

  static schema: SupCore.data.base.Schema = {
    pixelsPerUnit: { type: "integer", min: 1, mutable: true }
  }

  constructor(pub: any, serverData: any) {
    super(pub, CubicModelSettingsResource.schema, serverData);
  }

  setup() {}

  init(callback: Function) {
    this.pub = {
      pixelsPerUnit: 16
    };

    super.init(callback);
  }
}
