interface SceneSettingsResourcePub {
  formatVersion: number;

  defaultCameraMode: string;
  defaultVerticalAxis: string;
  [key: string]: any;
}

export default class SceneSettingsResource extends SupCore.Data.Base.Resource {
  static currentFormatVersion = 1;

  static schema: SupCore.Data.Base.Schema = {
    formatVersion: { type: "integer" },

    defaultCameraMode: { type: "enum", items: [ "3D", "2D" ], mutable: true },
    defaultVerticalAxis: { type: "enum", items: [ "Y", "Z" ], mutable: true }
  };

  pub: SceneSettingsResourcePub;

  constructor(id: string, pub: any, server: ProjectServer) {
    super(id, pub, SceneSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      formatVersion: SceneSettingsResource.currentFormatVersion,

      defaultCameraMode: "3D",
      defaultVerticalAxis: "Y"
    };

    super.init(callback);
  }

  migrate(resourcePath: string, pub: SceneSettingsResourcePub, callback: (hasMigrated: boolean) => void) {
    if (pub.formatVersion === SceneSettingsResource.currentFormatVersion) { callback(false); return; }

    if (pub.formatVersion == null) {
      // NOTE: Vertical axis was introduced in Superpowers 0.13
      if (pub.defaultVerticalAxis == null) pub.defaultVerticalAxis = "Y";

      pub.formatVersion = 1;
    }

    callback(true);
  }
}
