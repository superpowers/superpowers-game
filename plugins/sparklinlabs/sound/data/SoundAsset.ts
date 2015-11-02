import * as path from "path";
import * as fs from "fs";

export default class SoundAsset extends SupCore.data.base.Asset {
  static schema: SupCore.data.base.Schema = {
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
    fs.readFile(path.join(assetPath, "sound.json"), { encoding: "utf8" }, (err, json) => {
      if (err != null && err.code === "ENOENT") {
        fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
          let pub = JSON.parse(json);
          if (pub.streaming == null) pub.streaming = false;

          fs.rename(path.join(assetPath, "asset.json"), path.join(assetPath, "sound.json"), (err) => {
            pub = JSON.parse(json);
            fs.readFile(path.join(assetPath, "sound.dat"), (err, buffer) => {
              pub.sound = buffer;
              this.pub = pub;
              this.emit("load");
            });
          });


        });
      } else {
        let pub = JSON.parse(json);
        if (pub.streaming == null) pub.streaming = false;

        fs.readFile(path.join(assetPath, "sound.dat"), (err, buffer) => {
          pub.sound = buffer;
          this.pub = pub;
          this.emit("load");
        });
      }
    });
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
