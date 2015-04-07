import path = require("path");
import fs = require("fs");

class SoundAsset extends SupCore.data.base.Asset {
  static schema = {
    sound: { type: "buffer" },
    streaming: { type: "boolean", mutable: true }
  }

  constructor(id: string, pub: any, serverData?: any) {
    super(id, pub, SoundAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.pub = { sound: new Buffer(0), streaming: false };
    super.init(options, callback);
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      this.pub = JSON.parse(json);
      if (this.pub.streaming == null) this.pub.streaming = false;

      fs.readFile(path.join(assetPath, "sound.dat"), (err, buffer) => {
        this.pub.sound = buffer;
        this.emit("load");
      });
    });
  }

  save(assetPath: string, callback: Function) {
    var buffer = this.pub.sound;
    delete this.pub.sound;
    var json = JSON.stringify(this.pub, null, 2);
    this.pub.sound = buffer;
    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, () => {
      fs.writeFile(path.join(assetPath, "sound.dat"), buffer, callback);
    });
  }

  server_upload(client: any, sound: any, callback: (err: string, sound?: Buffer) => any) {
    if (! (sound instanceof Buffer)) { callback("Sound must be an ArrayBuffer"); return; }

    this.pub.sound = sound;

    callback(null, sound);
    this.emit("change");
  }

  client_upload(sound: any) {
    this.pub.sound = sound;
  }
}

export = SoundAsset;
