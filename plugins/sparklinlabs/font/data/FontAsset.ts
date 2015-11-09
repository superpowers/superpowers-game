import * as path from "path";
import * as fs from "fs";

// FontFace is a very new feature (supported in Chrome only). Not available in lib.d.ts just yet
declare let FontFace: any;

// Reference to THREE, client-side only
let THREE: typeof SupEngine.THREE;
if ((<any>global).window != null) THREE = SupEngine.THREE;

export interface FontPub {
  isBitmap: boolean; filtering: string; pixelsPerUnit: number;
  font: Buffer; size: number; color: string; name?: string;
  bitmap: Buffer; gridWidth: number; gridHeight: number; charset: string; charsetOffset: number; texture?: THREE.Texture;
}

export default class FontAsset extends SupCore.data.base.Asset {

  static schema: SupCore.data.base.Schema = {
    isBitmap: { type: "boolean", mutable: true},
    filtering: { type: "enum", items: [ "pixelated", "smooth"], mutable: true },
    pixelsPerUnit: { type: "number", minExcluded: 0, mutable: true },

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

  url: string;
  font: any;

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

      // NOTE: Legacy stuff from Superpowers 0.7
      if (this.pub.color == null || this.pub.color.length !== 6) this.pub.color = "ffffff";

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

  client_load() { this._loadFont(); }
  client_unload() { this._unloadFont(); }

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

  _loadFont() {
    this._unloadFont();

    if (this.pub.isBitmap) this._loadBitmapFont();
    else this._loadTTFont();
  }

  _unloadFont() {
    if (this.url != null) URL.revokeObjectURL(this.url);

    if (this.font != null) delete this.font;
    if (this.pub.texture != null) {
      this.pub.texture.dispose();
      this.pub.texture = null;
    }
  }

  _loadTTFont() {
    if ((<any>this.pub.font).byteLength === 0) return;

    let typedArray = new Uint8Array(this.pub.font);
    let blob = new Blob([ typedArray ], { type: "font/*" });
    this.url = URL.createObjectURL(blob);
    this.pub.name = `Font${this.id}`;
    this.font = new FontFace(this.pub.name, `url(${this.url})`);
    (<any>document).fonts.add(this.font);
  }

  _loadBitmapFont() {
    if ((<any>this.pub.bitmap).byteLength === 0) return;

    let image = new Image();
    let typedArray = new Uint8Array(this.pub.bitmap);
    let blob = new Blob([ typedArray ], { type: "image/*" });
    this.url = URL.createObjectURL(blob);
    image.src = this.url;

    this.pub.texture = new THREE.Texture(image);
    if (this.pub.filtering === "pixelated") {
      this.pub.texture.magFilter = THREE.NearestFilter;
      this.pub.texture.minFilter = THREE.NearestFilter;
    }

    if (!image.complete) image.addEventListener("load", () => { this.pub.texture.needsUpdate = true; });
  }

  _setupFiltering() {
    if (this.pub.filtering === "pixelated") {
      this.pub.texture.magFilter = THREE.NearestFilter;
      this.pub.texture.minFilter = THREE.NearestFilter;
    } else {
      this.pub.texture.magFilter = THREE.LinearFilter;
      this.pub.texture.minFilter = THREE.LinearFilter;
    }
    this.pub.texture.needsUpdate = true;
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

    this._loadFont();
  }

  client_setProperty(path: string, value: any) {
    super.client_setProperty(path, value);

    if (path === "isBitmap") this._loadFont();
    if (path === "filtering") this._setupFiltering();
  }
}
