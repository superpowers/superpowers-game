import * as path from "path";
import * as fs from "fs";

export default class SceneSettingsResource extends SupCore.data.base.Resource {

  static schema = {
    defaultCameraMode: { type: "enum", items: [ "3D", "2D" ], mutable: true },
    defaultVerticalAxis: { type: "enum", items: [ "Y", "Z" ], mutable: true }
  }

  constructor(pub: any, serverData: any) {
    if (pub != null) {
      // NOTE: Vertical axis was introduced in Superpowers 0.13
      if (pub.defaultVerticalAxis == null) pub.defaultVerticalAxis = "Y";
    }

    super(pub, SceneSettingsResource.schema, serverData);
  }

  setup() {}

  init(callback: Function) {
    this.pub = {
      defaultCameraMode: "3D",
      defaultVerticalAxis: "Y"
    };

    super.init(callback);
  }
}
