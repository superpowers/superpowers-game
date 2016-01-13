import * as path from "path";
import * as fs from "fs";

interface SoundAssetPub {
  formatVersion: number;
  sound: Buffer;
  streaming: boolean;
}

export default class SoundAsset extends SupCore.Data.Base.Asset {
  static currentFormatVersion = 1;

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    sound: { type: "buffer" },
    streaming: { type: "boolean", mutable: true }
  };

  pub: SoundAssetPub;

  constructor(id: string, pub: SoundAssetPub, server?: ProjectServer) {
    super(id, pub, SoundAsset.schema, server);
  }

  init(options: any, callback: Function) {
    this.pub = { formatVersion: SoundAsset.currentFormatVersion, sound: new Buffer(0), streaming: false };
    super.init(options, callback);
  }

  load(assetPath: string) {
    let pub: SoundAssetPub;
    fs.readFile(path.join(assetPath, "sound.json"), { encoding: "utf8" }, (err, json) => {
      // NOTE: "asset.json" was renamed to "sound.json" in Superpowers 0.11
      if (err != null && err.code === "ENOENT") {
        fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
          fs.rename(path.join(assetPath, "asset.json"), path.join(assetPath, "sound.json"), (err) => {
            pub = JSON.parse(json);
            fs.readFile(path.join(assetPath, "sound.dat"), (err, buffer) => {
              pub.sound = buffer;
              this._onLoaded(assetPath, pub);
            });
          });
        });
      } else {
        pub = JSON.parse(json);
        fs.readFile(path.join(assetPath, "sound.dat"), (err, buffer) => {
          pub.sound = buffer;
          this._onLoaded(assetPath, pub);
        });
      }
    });
  }

  migrate(assetPath: string, pub: SoundAssetPub, callback: (hasMigrated: boolean) => void) {
    if (pub.formatVersion === SoundAsset.currentFormatVersion) { callback(false); return; }

    if (pub.formatVersion == null) {
      if (pub.streaming == null) pub.streaming = false;
      pub.formatVersion = 1;
    }

    callback(true);
  }

  save(assetPath: string, callback: Function) {
    let buffer = this.pub.sound;
    delete this.pub.sound;
    let json = JSON.stringify(this.pub, null, 2);
    this.pub.sound = buffer;
    fs.writeFile(path.join(assetPath, "sound.json"), json, { encoding: "utf8" }, () => {
      fs.writeFile(path.join(assetPath, "sound.dat"), buffer, callback);
    });
  }

  server_upload(client: any, sound: Buffer, callback: (err: string, sound?: Buffer) => any) {
    if (!(sound instanceof Buffer)) { callback("Sound must be an ArrayBuffer"); return; }

    this.pub.sound = sound;

    callback(null, sound);
    this.emit("change");
  }

  client_upload(sound: Buffer) {
    this.pub.sound = sound;
  }
}
