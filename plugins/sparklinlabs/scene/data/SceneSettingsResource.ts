import * as path from "path";
import * as fs from "fs";

export default class SceneSettingsResource extends SupCore.data.base.Resource {
  static currentFormatVersion = 1;

  static schema: SupCore.data.base.Schema = {
    formatVersion: { type: "integer" },

    defaultCameraMode: { type: "enum", items: [ "3D", "2D" ], mutable: true },
    defaultVerticalAxis: { type: "enum", items: [ "Y", "Z" ], mutable: true }
  }

  constructor(pub: any, serverData: any) {
    super(pub, SceneSettingsResource.schema, serverData);
  }

  init(callback: Function) {
    this.pub = {
      formatVersion: SceneSettingsResource.currentFormatVersion,

      defaultCameraMode: "3D",
      defaultVerticalAxis: "Y"
    };

    super.init(callback);
  }

  migrate(resourcePath: string, callback: (hasMigrated: boolean) => void) {
    if (this.pub.formatVersion === SceneSettingsResource.currentFormatVersion) { callback(false); return; }

    if (this.pub.formatVersion == null) {
      // NOTE: Vertical axis was introduced in Superpowers 0.13
      if (this.pub.defaultVerticalAxis == null) this.pub.defaultVerticalAxis = "Y";

      this.pub.formatVersion = 1;
    }

    callback(true);
  }
}
