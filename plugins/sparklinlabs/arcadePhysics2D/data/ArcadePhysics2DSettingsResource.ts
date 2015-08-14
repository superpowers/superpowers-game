import * as path from "path";
import * as fs from "fs";

export default class ArcadePhysics2DSettingsResource extends SupCore.data.base.Resource {

  static schema = {
    plane: { type: "enum", items: [ "XY", "XZ" ], mutable: true }
  }

  constructor(pub: any, serverData: any) {
    super(pub, ArcadePhysics2DSettingsResource.schema, serverData);
  }

  setup() {}

  init(callback: Function) {
    this.pub = {
      plane: "XY"
    };

    super.init(callback);
  }
}
