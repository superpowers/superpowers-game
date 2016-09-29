import * as path from "path";

export interface GameSettingsResourcePub {
  formatVersion: number;

  startupSceneId: string;
  framesPerSecond: number;
  ratioNumerator: number;
  ratioDenominator: number;
  customLayers: string[];
  [key: string]: any;
}

export default class GameSettingsResource extends SupCore.Data.Base.Resource {
  static currentFormatVersion = 1;

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    startupSceneId: { type: "string?", mutable: true },
    framesPerSecond: { type: "integer", minExcluded: 0, mutable: true },
    ratioNumerator: { type: "integer?", mutable: true },
    ratioDenominator: { type: "integer?", mutable: true },
    customLayers: {
      type: "array", mutable: true, minLength: 0, maxLength: 8,
      items: { type: "string", minLength: 1, maxLength: 80 }
    }
  };

  pub: GameSettingsResourcePub;

  constructor(id: string, pub: GameSettingsResourcePub, server?: ProjectServer) {
    super(id, pub, GameSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      formatVersion: GameSettingsResource.currentFormatVersion,

      startupSceneId: null,
      framesPerSecond: 60,
      ratioNumerator: null, ratioDenominator: null,
      customLayers: []
    };
    super.init(callback);
  }

  migrate(resourcePath: string, pub: GameSettingsResourcePub, callback: (hasMigrated: boolean) => void) {
    if (pub.formatVersion === GameSettingsResource.currentFormatVersion) { callback(false); return; }

    if (pub.formatVersion == null) {
      // NOTE: Custom layers were introduced in Superpowers 0.8
      if (pub.customLayers == null) pub.customLayers = [];

      this.server.data.entries.walk((node) => {
        const path = this.server.data.entries.getPathFromId(node.id);
        if (path === (<any>pub).startupScene) pub.startupSceneId = node.id;
      });
      delete (<any>pub).startupScene;

      pub.formatVersion = 1;
    }

    callback(true);
  }

  restore() {
    if (this.pub.startupSceneId != null && this.server.data.entries.byId[this.pub.startupSceneId] != null) {
      this.emit("setAssetBadge", this.pub.startupSceneId, "startupScene", "info");
    }
  }

  clientExport(outputPath: string, callback: (err: Error) => void) {
    SupApp.writeFile(path.join(outputPath, "resource.json"), JSON.stringify(this.pub), callback);
  }

  server_setProperty(client: SupCore.RemoteClient, path: string, value: number|string|boolean, callback: SupCore.Data.Base.SetPropertyCallback) {
    let oldSceneId: string;
    if (path === "startupSceneId") oldSceneId = this.pub.startupSceneId;

    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      if (path === "startupSceneId") {
        if (oldSceneId != null && this.server.data.entries.byId[oldSceneId] != null) this.emit("clearAssetBadge", oldSceneId, "startupScene");
        if (actualValue != null && this.server.data.entries.byId[actualValue] != null) this.emit("setAssetBadge", actualValue, "startupScene", "info");
      }

      callback(null, null, path, actualValue);
    });
  }
}
