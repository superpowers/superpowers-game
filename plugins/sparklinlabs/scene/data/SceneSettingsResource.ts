import * as path from "path";
import * as fs from "fs";

export default class SceneSettingsResource extends SupCore.data.base.Resource {

  static schema = {
    defaultCameraMode: { type: "enum", items: [ "3D", "2D" ], mutable: true },
  }

  constructor(pub: any, serverData: any) {
    super(pub, SceneSettingsResource.schema, serverData);
  }

  setup() {}

  init(callback: Function) {
    this.pub = {
      defaultCameraMode: "3D"
    };

    super.init(callback);
  }
}
