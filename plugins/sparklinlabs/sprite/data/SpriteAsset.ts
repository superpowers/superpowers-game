import * as path from "path";
import * as fs from "fs";
import * as async from "async";

import SpriteAnimations, { SpriteAnimationPub } from "./SpriteAnimations";

// Reference to THREE, client-side only
let THREE: typeof SupEngine.THREE;
if ((<any>global).window != null && (<any>window).SupEngine != null) THREE = SupEngine.THREE;

interface TextureWithSize extends THREE.Texture {
  size?: {
    width: number;
    height: number;
  };
}

export interface SpriteAssetPub {
  formatVersion: number;

  // FIXME: This is used client-side to store shared THREE.js textures
  // We should probably find a better place for it
  textures?: { [name: string]: TextureWithSize; };
  maps: { [name: string]: Buffer; };
  filtering: string;

  pixelsPerUnit: number;
  framesPerSecond: number;
  opacity: number;
  alphaTest: number;
  frameOrder: string;

  grid: { width: number; height: number; };
  origin: { x: number; y: number; };

  animations: SpriteAnimationPub[];

  mapSlots: { [name: string]: string; };
}

export default class SpriteAsset extends SupCore.Data.Base.Asset {
  static currentFormatVersion = 2;

  static schema: SupCore.Data.Base.Schema = {
    formatVersion: { type: "integer" },

    maps: {
      type: "hash",
      values: {
        type: "buffer",
      }
    },
    filtering: { type: "enum", items: [ "pixelated", "smooth"], mutable: true },
    pixelsPerUnit: { type: "number", minExcluded: 0, mutable: true },
    framesPerSecond: { type: "number", minExcluded: 0, mutable: true },
    opacity: { type: "number?", min: 0, max: 1, mutable: true },
    alphaTest: { type: "number", min: 0, max: 1, mutable: true },
    frameOrder: { type: "enum", items: [ "rows", "columns"], mutable: true },

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

    animations: { type: "array" },

    mapSlots: {
      type: "hash",
      properties: {
        map: { type: "string?", mutable: true },
        light: { type: "string?", mutable: true },
        specular: { type: "string?", mutable: true },
        alpha: { type: "string?", mutable: true },
        normal: { type: "string?", mutable: true }
      }
    }
  };

  animations: SpriteAnimations;
  pub: SpriteAssetPub;

  // Only used on client-side
  mapObjectURLs: { [mapName: string]: string };

  constructor(id: string, pub: SpriteAssetPub, server: ProjectServer) {
    super(id, pub, SpriteAsset.schema, server);
  }

  init(options: any, callback: Function) {
    this.server.data.resources.acquire("spriteSettings", null, (err: Error, spriteSettings: any) => {
      this.pub = {
        formatVersion: SpriteAsset.currentFormatVersion,

        maps: { map: new Buffer(0) },
        filtering: spriteSettings.pub.filtering,
        pixelsPerUnit: spriteSettings.pub.pixelsPerUnit,
        framesPerSecond: spriteSettings.pub.framesPerSecond,
        opacity: null,
        alphaTest: spriteSettings.pub.alphaTest,
        frameOrder: "rows",

        grid: { width: 100, height: 100 },
        origin: { x: 0.5, y: 0.5 },

        animations: [],

        mapSlots: {
          map: "map",
          light: null,
          specular: null,
          alpha: null,
          normal: null
        }
      };

      this.server.data.resources.release("spriteSettings", null);
      super.init(options, callback);
    });
  }

  setup() {
    this.animations = new SpriteAnimations(this.pub.animations);
  }

  load(assetPath: string) {
    let pub: SpriteAssetPub;
    let loadMaps = () => {
      let mapsName: string[] = <any>pub.maps;
      // NOTE: Support for multiple maps was introduced in Superpowers 0.11
      if (mapsName == null) mapsName = ["map"];

      pub.maps = {};
      async.series([
        (callback) => {
          async.each(mapsName, (key, cb) => {
            fs.readFile(path.join(assetPath, `map-${key}.dat`), (err, buffer) => {
              // TODO: Handle error but ignore ENOENT
              if (err != null) {
                // NOTE: image.dat was renamed to "map-map.dat" in Superpowers 0.11
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

      ], (err) => { this._onLoaded(assetPath, pub); });
    };

    fs.readFile(path.join(assetPath, "sprite.json"), { encoding: "utf8" }, (err, json) => {
      // NOTE: "asset.json" was renamed to "sprite.json" in Superpowers 0.11
      if (err != null && err.code === "ENOENT") {
        fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
          fs.rename(path.join(assetPath, "asset.json"), path.join(assetPath, "sprite.json"), (err) => {
            pub = JSON.parse(json);
            loadMaps();
          });
        });
      } else {
        pub = JSON.parse(json);
        loadMaps();
      }
    });
  }

  migrate(assetPath: string, pub: SpriteAssetPub, callback: (hasMigrated: boolean) => void) {
    if (pub.formatVersion === SpriteAsset.currentFormatVersion) { callback(false); return; }

    if (pub.formatVersion == null) {
      // NOTE: Opacity setting was introduced in Superpowers 0.8
      if (typeof pub.opacity === "undefined") pub.opacity = 1;

      // NOTE: Support for multiple maps was introduced in Superpowers 0.11
      if (pub.frameOrder == null) pub.frameOrder = "rows";
      if ((pub as any).advancedTextures == null) {
        (pub as any).advancedTextures = false;
        pub.mapSlots = {
          map: "map",
          light: null,
          specular: null,
          alpha: null,
          normal: null
        };
      }

      // NOTE: Animation speed was introduced in Superpowers 0.12
      for (let animation of pub.animations) {
        if (animation.speed == null) animation.speed = 1;
      }

      pub.formatVersion = 1;
    }

    if (pub.formatVersion === 1) {
      delete (pub as any).advancedTextures;
      pub.formatVersion = 2;
    }

    callback(true);
  }

  client_load() {
    this.mapObjectURLs = {};
    this._loadTextures();
  }

  client_unload() {
    this._unloadTextures();
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

    async.series([
      (callback) => { fs.writeFile(path.join(assetPath, "sprite.json"), json, { encoding: "utf8" }, (err) => { callback(err, null); }); },

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

  _unloadTextures() {
    for (let textureName in this.pub.textures) this.pub.textures[textureName].dispose();

    for (let key in this.mapObjectURLs) {
      URL.revokeObjectURL(this.mapObjectURLs[key]);
      delete this.mapObjectURLs[key];
    }
  }

  _loadTextures() {
    this._unloadTextures();
    this.pub.textures = {};

    Object.keys(this.pub.maps).forEach((key) => {
      let buffer: any = this.pub.maps[key];
      if (buffer == null || buffer.byteLength === 0) return;

      let texture = this.pub.textures[key];
      let image: HTMLImageElement = (texture != null) ? texture.image : null;

      if (image == null) {
        image = new Image;
        texture = this.pub.textures[key] = new THREE.Texture(image);

        if (this.pub.filtering === "pixelated") {
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
        }

        let typedArray = new Uint8Array(buffer);
        let blob = new Blob([ typedArray ], { type: "image/*" });
        image.src = this.mapObjectURLs[key] = URL.createObjectURL(blob);
      }

      if (!image.complete) {
        image.addEventListener("load", () => {
          // Three.js might resize our texture to make its dimensions power-of-twos
          // because of WebGL limitations (see https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL#Non_power-of-two_textures)
          // so we store its original, non-power-of-two size for later use
          texture.size = { width: image.width, height: image.height };
          texture.needsUpdate = true;
        });
      }
    });
  }

  client_setProperty(path: string, value: any) {
    super.client_setProperty(path, value);

    switch (path) {
      case "filtering":
        for (let textureName in this.pub.textures) {
          let texture = this.pub.textures[textureName];
          if (this.pub.filtering === "pixelated") {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
          } else {
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
          }
          texture.needsUpdate = true;
        }
        break;
    }
  }

  server_setMaps(client: any, maps: any, callback: (err: string, maps?: any) => any) {
    if (maps == null || typeof maps !== "object") { callback("Maps must be an object"); return; }

    for (let key in maps) {
      let value = maps[key];
      if (this.pub.maps[key] == null) { callback(`The map ${key} doesn't exist`); return; }
      if (value != null && !(value instanceof Buffer)) { callback(`Value for ${key} must be an ArrayBuffer or null`); return; }
    }

    for (let key in maps) this.pub.maps[key] = maps[key];

    callback(null, maps);
    this.emit("change");
  }

  client_setMaps(maps: any) {
    for (let key in maps) this.pub.maps[key] = maps[key];
    this._loadTextures();
  }

  server_newMap(client: any, name: string, callback: (err: string, name: string) => any) {
    if (name == null || typeof name !== "string") { callback("Name of the map must be a string", null); return; }
    if (this.pub.maps[name] != null) { callback(`The map ${name} already exists`, null); return; }

    this.pub.maps[name] = new Buffer(0);
    callback(null, name);
    this.emit("change");
  }

  client_newMap(name: string) {
    this.pub.maps[name] = new Buffer(0);
  }

  server_deleteMap(client: any, name: string, callback: (err: string, name: string) => any) {
    if (name == null || typeof name !== "string") { callback("Name of the map must be a string", null); return; }
    if (this.pub.maps[name] == null) { callback(`The map ${name} doesn't exist`, null); return; }

    if (this.pub.mapSlots["map"] === name) { callback(`The main map can't be deleted`, null); return; }

    this.client_deleteMap(name);
    callback(null, name);
    this.emit("change");
  }

  client_deleteMap(name: string) {
    for (let slotName in this.pub.mapSlots) {
      let map = this.pub.mapSlots[slotName];
      if (map === name) this.pub.mapSlots[slotName] = null;
    }

    // NOTE: do not delete, the key must exist so the file can be deleted from the disk when the asset is saved
    this.pub.maps[name] = null;
  }

  server_renameMap(client: any, oldName: string, newName: string, callback: (err: string, oldName: string, newName: string) => any) {
    if (oldName == null || typeof oldName !== "string") { callback("Name of the map must be a string", null, null); return; }
    if (newName == null || typeof newName !== "string") { callback("New name of the map must be a string", null, null); return; }
    if (this.pub.maps[newName] != null) { callback(`The map ${newName} already exists`, null, null); return; }

    this.client_renameMap(oldName, newName);
    callback(null, oldName, newName);
    this.emit("change");
  }

  client_renameMap(oldName: string, newName: string) {
    this.pub.maps[newName] = this.pub.maps[oldName];
    this.pub.maps[oldName] = null;

    for (let slotName in this.pub.mapSlots) {
      let map = this.pub.mapSlots[slotName];
      if (map === oldName) this.pub.mapSlots[slotName] = newName;
    }
  }

  server_setMapSlot(client: any, slot: string, map: string, callback: (err: string, slot: string, map: string) => any) {
    if (slot == null || typeof slot !== "string") { callback("Name of the slot must be a string", null, null); return; }
    if (map != null && typeof map !== "string") { callback("Name of the map must be a string", null, null); return; }
    if (map != null && this.pub.maps[map] == null) { callback(`The map ${map} doesn't exist`, null, null); return; }
    if (slot === "map" && map == null) { callback(`The main map can't be empty`, null, null); return; }

    this.pub.mapSlots[slot] = map;
    callback(null, slot, map);
    this.emit("change");
  }

  client_setMapSlot(slot: string, map: string) {
    this.pub.mapSlots[slot] = map;
  }

  server_newAnimation(client: any, name: string, callback: (err: string, animation?: SpriteAnimationPub, actualIndex?: number) => any) {
    let animation: SpriteAnimationPub = { id: null, name, startFrameIndex: 0, endFrameIndex: 0, speed: 1 };

    this.animations.add(animation, null, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      animation.name = SupCore.Data.ensureUniqueName(animation.id, animation.name, this.animations.pub);

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
    return;
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

      if (SupCore.Data.hasDuplicateName(id, value, this.animations.pub)) {
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
