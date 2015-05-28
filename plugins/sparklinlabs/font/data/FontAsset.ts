import * as path from "path";
import * as fs from "fs";

export interface FontPub {
  isBitmap: boolean; filtering: string; pixelsPerUnit: number;
  font: Buffer; size: number; color: string; name?: string;
  bitmap: Buffer; gridWidth: number; gridHeight: number; charset: string; charsetOffset: number; texture?: any;
}

export default class FontAsset extends SupCore.data.base.Asset {

  static schema = {
    isBitmap: { type: "boolean", mutable: true},
    filtering: { type: "enum", items: [ "pixelated", "smooth"], mutable: true },
    pixelsPerUnit: { type: "number", min: 1, mutable: true },

    font: { type: "buffer" },
    size: { type: "number", min: 1, mutable: true },
    color: { type: "string", length: 6, mutable: true },

    bitmap: { type: "buffer" },
    gridWidth: { type: "number", min: 1, mutable: true },
    gridHeight: { type: "number", min: 1, mutable: true },
    charset: { type: "string?", mutable: true },
    charsetOffset: { type: "number", min: 0, mutable: true },
  }

  pub: FontPub;

  constructor(id: string, pub: any, serverData: any) {
    super(id, pub, FontAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.pub = {
      isBitmap: false,
      filtering: "pixelated",
      pixelsPerUnit: 20,

      font: new Buffer(0),
      size: 32,
      color: "ffffff",

      bitmap: new Buffer(0),
      gridWidth: 16,
      gridHeight: 16,
      charset: null,
      charsetOffset: 32,
    }

    super.init(options, callback);
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      this.pub = JSON.parse(json);

      // TODO: Remove these casts at some point, legacy stuff from Superpowers 0.7
      if (this.pub.color.length !== 6) this.pub.color = "ffffff";

      fs.readFile(path.join(assetPath, "font.dat"), (err, buffer) => {
        this.pub.font = buffer;
        fs.readFile(path.join(assetPath, "bitmap.dat"), (err, buffer) => {
          this.pub.bitmap = buffer;
          this.setup();
          this.emit("load");
        });
      });
    });
  }

  save(assetPath: string, callback: Function) {
    let font = this.pub.font;
    let bitmap = this.pub.bitmap;
    delete this.pub.font;
    delete this.pub.bitmap;
    let json = JSON.stringify(this.pub, null, 2);
    this.pub.font = font;
    this.pub.bitmap = bitmap;

    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, () => {
      fs.writeFile(path.join(assetPath, "font.dat"), font, () => {
        fs.writeFile(path.join(assetPath, "bitmap.dat"), bitmap, callback);
      });
    });
  }

  server_upload(client: any, font: any, callback: (err: string, font: any) => any) {
    if (! (font instanceof Buffer)) { callback("Image must be an ArrayBuffer", null); return; }

    if (this.pub.isBitmap) this.pub.bitmap = font
    else this.pub.font = font

    callback(null, font);
    this.emit("change");
  }

  client_upload(font: any) {
    if (this.pub.isBitmap) this.pub.bitmap = font
    else this.pub.font = font
  }
}
