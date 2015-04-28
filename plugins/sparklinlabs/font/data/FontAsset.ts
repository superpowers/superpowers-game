import * as path from "path";
import * as fs from "fs";

export default class FontAsset extends SupCore.data.base.Asset {

  static schema = {
    isBitmap: { type: "boolean", mutable: true},

    font: { type: "buffer" },
    filtering: { type: "enum", items: [ "pixelated", "smooth"], mutable: true },
    pixelsPerUnit: { type: "number", min: 1, mutable: true },

    size: { type: "number", min: 1, mutable: true },
    color: { type: "string", min: 0, mutable: true }
  }

  constructor(id: string, pub: any, serverData: any) {
    super(id, pub, FontAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.pub = {
      isBitmap: false,

      font: new Buffer(0),
      filtering: "pixelated",
      pixelsPerUnit: 20,

      size: 32,
      color: "white"
    }

    super.init(options, callback);
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      this.pub = JSON.parse(json);
      fs.readFile(path.join(assetPath, "font.dat"), (err, buffer) => {
        this.pub.font = buffer;
        this.setup();
        this.emit("load");
      });
    });
  }

  save(assetPath: string, callback: Function) {
    let buffer = this.pub.font;
    delete this.pub.font;
    let json = JSON.stringify(this.pub, null, 2);
    this.pub.font = buffer;
    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, () => {
      fs.writeFile(path.join(assetPath, "font.dat"), buffer, callback);
    });
  }

  server_upload(client: any, font: any, callback: (err: string, font?: any) => any) {
    if (! (font instanceof Buffer)) { callback("Image must be an ArrayBuffer"); return; }

    this.pub.font = font

    callback(null, font);
    this.emit("change");
  }

  client_upload(font: any) {
    this.pub.font = font;
  }
}
