import path = require("path");
import fs = require("fs");

import SpriteAnimations = require("./SpriteAnimations");
interface Animation {
  id?: string;
  name: string;
  startFrameIndex: number;
  endFrameIndex: number;
}

class SpriteAsset extends SupCore.data.base.Asset {

  static schema = {
    image: { type: "buffer" },
    filtering: { type: "enum", items: [ "pixelated", "smooth"], mutable: true },
    pixelsPerUnit: { type: "number", min: 1, mutable: true },
    framesPerSecond: { type: "number", min: 1, mutable: true },
    alphaTest: { type: "number", min: 0, max: 1, mutable: true },

    grid: {
      type: "hash",
      properties: {
        width: { type: "integer", min: 1, mutable: true },
        height: { type: "integer", min: 1, mutable: true }
      }
    },

    origin: {
      type: "hash",
      properties: {
        x: { type: "number", min: 0, max: 1, mutable: true },
        y: { type: "number", min: 0, max: 1, mutable: true }
      }
    },

    animations: { type: "array" }
  }

  animations: SpriteAnimations;

  constructor(id: string, pub: any, serverData: any) {
    super(id, pub, SpriteAsset.schema, serverData);
  }

  setup() {
    this.animations = new SpriteAnimations(this.pub.animations);
  }

  init(options: any, callback: Function) {
    this.serverData.resources.acquire("spriteSettings", null, (err: string, spriteSettings: any) => {
      this.pub = {
        image: new Buffer(0),
        filtering: spriteSettings.pub.filtering,
        pixelsPerUnit: spriteSettings.pub.pixelsPerUnit,
        framesPerSecond: spriteSettings.pub.framesPerSecond,
        alphaTest: spriteSettings.pub.alphaTest,

        grid: { width: 100, height: 100 },
        origin: { x: 0.5, y: 0.5 },

        animations: []
      }

      this.serverData.resources.release("spriteSettings", null);
      super.init(options, callback);
    });
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      this.pub = JSON.parse(json);
      if (this.pub.alphaTest == null) this.pub.alphaTest = 0.1;
      fs.readFile(path.join(assetPath, "image.dat"), (err, buffer) => {
        this.pub.image = buffer;
        this.setup();
        this.emit("load");
      });
    });
  }

  save(assetPath: string, callback: Function) {
    var buffer = this.pub.image;
    delete this.pub.image;
    var json = JSON.stringify(this.pub, null, 2);
    this.pub.image = buffer;
    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, () => {
      fs.writeFile(path.join(assetPath, "image.dat"), buffer, callback);
    });
  }

  server_upload(client: any, image: any, callback: (err: string, image?: any) => any) {
    if (! (image instanceof Buffer)) { callback("Image must be an ArrayBuffer"); return; }

    this.pub.image = image

    callback(null, image);
    this.emit("change");
  }

  client_upload(image: any) {
    this.pub.image = image;
  }

  server_newAnimation(client: any, name: string, callback: (err: string, animation?: Animation, actualIndex?: number) => any) {
    var animation: Animation = { name, startFrameIndex: 0, endFrameIndex: 0 };

    this.animations.add(animation, null, (err, actualIndex) => {
      if (err != null) { callback(err); return }

      animation.name = SupCore.data.ensureUniqueName(animation.id, animation.name, this.animations.pub);

      callback(null, animation, actualIndex);
      this.emit("change");
    });
  }

  client_newAnimation(animation: Animation, actualIndex: number) {
    this.animations.client_add(animation, actualIndex);
  }

  server_deleteAnimation(client: any, id: string, callback: (err: string, id?: string) => any) {
    this.animations.remove(id, (err) => {
      if (err != null) { callback(err); return; }

      callback(null, id);
      this.emit("change");
    });
  }

  client_deleteAnimation(id: string) {
    this.animations.client_remove(id);
    return
  }

  server_moveAnimation(client: any, id: string, newIndex: number, callback: (err: string, id?: string, actualIndex?: number) => any) {
    this.animations.move(id, newIndex, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      callback(null, id, actualIndex);
      this.emit("change");
    });
  }

  client_moveAnimation(id: string, newIndex: number) {
    this.animations.client_move(id, newIndex);
  }

  server_setAnimationProperty(client: any, id: string, key: string, value: any, callback: (err: string, id?: string, key?: string, actualValue?: any) => any) {
    if (key === "name") {
      if (typeof(value) !== "string") { callback("Invalid value"); return; }
      value = value.trim();

      if (SupCore.data.hasDuplicateName(id, value, this.animations.pub)) {
        callback("There's already an animation with this name");
        return;
      }
    }
    this.animations.setProperty(id, key, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, id, key, actualValue);
      this.emit("change");
    });
  }

  client_setAnimationProperty(id: string, key: string, actualValue: any) {
    this.animations.client_setProperty(id, key, actualValue);
  }
}
export = SpriteAsset;
