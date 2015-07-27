import * as path from "path";
import * as fs from "fs";
import * as async from "async";

import SpriteAnimations, { SpriteAnimationPub } from "./SpriteAnimations";

interface SpriteAssetPub {
  textures?: { [name: string]: any; };
  maps: { [name: string]: Buffer; };
  filtering: string;
  pixelsPerUnit: number;
  framesPerSecond: number;
  opacity: number;
  alphaTest: number;

  grid: { width: number; height: number;};
  origin: { x: number; y: number; };

  animations: SpriteAnimationPub[];
}

export default class SpriteAsset extends SupCore.data.base.Asset {

  static schema = {
    maps: {
      type: "hash",
      values: {
        type: "buffer",
      }
    },
    filtering: { type: "enum", items: [ "pixelated", "smooth"], mutable: true },
    pixelsPerUnit: { type: "number", min: 1, mutable: true },
    framesPerSecond: { type: "number", min: 1, mutable: true },
    opacity: { type: "number?", min: 0, max: 1, mutable: true },
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
  };

  animations: SpriteAnimations;
  pub: SpriteAssetPub;

  constructor(id: string, pub: SpriteAssetPub, serverData: any) {
    super(id, pub, SpriteAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.serverData.resources.acquire("spriteSettings", null, (err: Error, spriteSettings: any) => {
      this.pub = {
        maps: { map: new Buffer(0) },
        filtering: spriteSettings.pub.filtering,
        pixelsPerUnit: spriteSettings.pub.pixelsPerUnit,
        framesPerSecond: spriteSettings.pub.framesPerSecond,
        opacity: null,
        alphaTest: spriteSettings.pub.alphaTest,

        grid: { width: 100, height: 100 },
        origin: { x: 0.5, y: 0.5 },

        animations: []
      };

      this.serverData.resources.release("spriteSettings", null);
      super.init(options, callback);
    });
  }

  setup() {
    this.animations = new SpriteAnimations(this.pub.animations);
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      let pub: SpriteAssetPub = JSON.parse(json);

      // TODO: Remove these at some point, new config setting introduced in Superpowers 0.8
      if (typeof pub.opacity === "undefined") pub.opacity = 1;

      let mapsName: string[] = <any>pub.maps;
      // TODO: Remove these at some point, asset migration introduced in Superpowers 0.11
      if (mapsName == null) mapsName = ["map"];
      
      pub.maps = {};
      async.series([
        (callback) => {
          async.each(mapsName, (key, cb) => {
            fs.readFile(path.join(assetPath, `map-${key}.dat`), (err, buffer) => {
              // TODO: Handle error but ignore ENOENT
              if (err != null) {
                // TODO: Remove these at some point, asset migration introduced in Superpowers 0.11
                if (err.code === "ENOENT" && key === "map") {
                  fs.readFile(path.join(assetPath, "image.dat"), (err, buffer) => {
                    pub.maps[key] = buffer;
                    
                    fs.writeFile(path.join(assetPath, `map-${key}.dat`), buffer);
                    fs.unlink(path.join(assetPath, "image.dat"));
                    cb();
                  });
                } else cb();
                return;
              }
              pub.maps[key] = buffer;
              cb();
            });
          }, (err) => { callback(err, null); });
        }

      ], (err) => {
        this.pub = pub;
        this.setup();
        this.emit("load");
      });
    });
  }

  save(assetPath: string, saveCallback: Function) {
    let maps = this.pub.maps;
    let mapsName = <string[]>[];
    for (let key in maps) {
      if (maps[key] != null) mapsName.push(key);
    }
    (<any>this.pub).maps = mapsName;
    let json = JSON.stringify(this.pub, null, 2);
    this.pub.maps = maps;
    
    async.series<Error>([
      (callback) => { fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, (err) => { callback(err, null); }); },

      (callback) => {
        async.each(mapsName, (key, cb) => {
          let value = maps[key];

          if (value == null) {
            fs.unlink(path.join(assetPath, `map-${key}.dat`), (err) => {
              if (err != null && err.code !== "ENOENT") { cb(err); return; }
              cb();
            });
            return;
          }

          fs.writeFile(path.join(assetPath, `map-${key}.dat`), value, cb);
        }, (err) => { callback(err, null); });
      }

    ], (err) => { saveCallback(err); });
  }

  server_upload(client: any, buffer: any, callback: (err: string, buffer?: any) => any) {
    if (! (buffer instanceof Buffer)) { callback("buffer must be an ArrayBuffer"); return; }

    this.pub.maps["map"] = buffer;

    callback(null, buffer);
    this.emit("change");
  }

  client_upload(buffer: any) {
    this.pub.maps["map"] = buffer;
  }

  server_newAnimation(client: any, name: string, callback: (err: string, animation?: SpriteAnimationPub, actualIndex?: number) => any) {
    let animation: SpriteAnimationPub = { id: null, name, startFrameIndex: 0, endFrameIndex: 0 };

    this.animations.add(animation, null, (err, actualIndex) => {
      if (err != null) { callback(err); return }

      animation.name = SupCore.data.ensureUniqueName(animation.id, animation.name, this.animations.pub);

      callback(null, animation, actualIndex);
      this.emit("change");
    });
  }

  client_newAnimation(animation: SpriteAnimationPub, actualIndex: number) {
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
