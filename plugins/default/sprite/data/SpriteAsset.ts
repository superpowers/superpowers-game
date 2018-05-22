import * as path from "path";
import * as fs from "fs";
import * as async from "async";

import SpriteAnimations, { SpriteAnimationPub } from "./SpriteAnimations";

// Reference to THREE, client-side only
let THREE: typeof SupEngine.THREE;
if ((global as any).window != null && (window as any).SupEngine != null) THREE = SupEngine.THREE;

type SetMapsCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, maps: any) => void);
type NewMapCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, name: string) => void);
type DeleteMapCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, name: string) => void);
type RenameMapCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, oldName: string, newName: string) => void);
type SetMapSlotCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, slot: string, name: string) => void);

type NewAnimationCallback = SupCore.Data.Base.ErrorCallback & ((err: string, animationId: string, animation: SpriteAnimationPub, index: number) => void);
type DeleteAnimationCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, id: string) => void);
type MoveAnimationCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, id: string, index: number) => void);
type SetAnimationPropertyCallback = SupCore.Data.Base.ErrorCallback & ((err: string, ack: any, id: string, key: string, actualValue: any) => void);

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
  wrapping: string;

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
  static currentFormatVersion = 3;

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    maps: {
      type: "hash",
      values: {
        type: "buffer",
      }
    },
    filtering: { type: "enum", items: [ "pixelated", "smooth"], mutable: true },
    wrapping: { type: "enum", items: [ "clampToEdge", "repeat", "mirroredRepeat"], mutable: true },
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
      },
      mutable: true
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
      this.server.data.resources.release("spriteSettings", null);

      this.pub = {
        formatVersion: SpriteAsset.currentFormatVersion,

        maps: { map: new Buffer(0) },
        filtering: spriteSettings.pub.filtering,
        wrapping: "clampToEdge",
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

      super.init(options, callback);
    });
  }

  setup() {
    this.animations = new SpriteAnimations(this.pub.animations);
  }

  load(assetPath: string) {
    let pub: SpriteAssetPub;
    const loadMaps = () => {
      let mapsName: string[] = pub.maps as any;
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

                    fs.writeFile(path.join(assetPath, `map-${key}.dat`), buffer, (err) => { /* Ignore */ });
                    fs.unlink(path.join(assetPath, "image.dat"), (err) => { /* Ignore */ });
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
      for (const animation of pub.animations) {
        if (animation.speed == null) animation.speed = 1;
      }
      pub.formatVersion = 1;
    }

    if (pub.formatVersion === 1) {
      delete (pub as any).advancedTextures;
      pub.formatVersion = 2;
    }

  // NOTE : Wrapping was introduced in Superpowers 0.18
    if (pub.formatVersion === 2) {
      pub.wrapping = "clampToEdge";
      pub.formatVersion = 3;
    }

    callback(true);
  }

  client_load() {
    this.mapObjectURLs = {};
    this.loadTextures();
  }

  client_unload() {
    this.unloadTextures();
  }

  save(outputPath: string, callback: (err: Error) => void) {
    this.write(fs.writeFile, outputPath, (err) => {
      if (err != null) { callback(err); return; }

      // Clean up old maps from disk
      async.each(Object.keys(this.pub.maps), (key, cb) => {
        const value = this.pub.maps[key];
        if (value != null) { cb(); return; }

        fs.unlink(path.join(outputPath, `map-${key}.dat`), (err) => {
          if (err != null && err.code !== "ENOENT") { cb(err); return; }
          cb();
        });
      }, callback);
    });
  }

  clientExport(outputPath: string, callback: (err: Error) => void) {
    this.write(SupApp.writeFile, outputPath, callback);
  }

  private write(writeFile: Function, outputPath: string, writeCallback: (err: Error) => void) {
    const maps = this.pub.maps;

    (this.pub as any).maps = [];
    for (const mapName in maps) {
      if (maps[mapName] != null) (this.pub as any).maps.push(mapName);
    }

    const textures = this.pub.textures;
    delete this.pub.textures;

    const json = JSON.stringify(this.pub, null, 2);

    this.pub.maps = maps;
    this.pub.textures = textures;

    async.series([
      (callback) => { writeFile(path.join(outputPath, "sprite.json"), json, { encoding: "utf8" }, callback); },

      (callback) => {
        async.each(Object.keys(maps), (key, cb) => {
          let value = maps[key];
          if (value == null) { cb(); return; }
          if (value instanceof ArrayBuffer) value = new Buffer(value);

          writeFile(path.join(outputPath, `map-${key}.dat`), value, cb);
        }, callback);
      }
    ], writeCallback);
  }

  private unloadTextures() {
    for (const textureName in this.pub.textures) this.pub.textures[textureName].dispose();

    for (const key in this.mapObjectURLs) {
      URL.revokeObjectURL(this.mapObjectURLs[key]);
      delete this.mapObjectURLs[key];
    }
  }

  private loadTextures() {
    this.unloadTextures();
    this.pub.textures = {};

    Object.keys(this.pub.maps).forEach((key) => {
      const buffer: any = this.pub.maps[key];
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

        if (this.pub.wrapping === "repeat") {
          texture.wrapS = SupEngine.THREE.RepeatWrapping;
          texture.wrapT = SupEngine.THREE.RepeatWrapping;
        } else if (this.pub.wrapping === "mirroredRepeat") {
          texture.wrapS = SupEngine.THREE.MirroredRepeatWrapping;
          texture.wrapT = SupEngine.THREE.MirroredRepeatWrapping;
        }

        const typedArray = new Uint8Array(buffer);
        const blob = new Blob([ typedArray ], { type: "image/*" });
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
        for (const textureName in this.pub.textures) {
          const texture = this.pub.textures[textureName];
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
      case "wrapping":
        for (const textureName in this.pub.textures) {
          const texture = this.pub.textures[textureName];
          if (value === "clampToEdge") {
            texture.wrapS = SupEngine.THREE.ClampToEdgeWrapping;
            texture.wrapT = SupEngine.THREE.ClampToEdgeWrapping;
          } else if (value === "repeat") {
            texture.wrapS = SupEngine.THREE.RepeatWrapping;
            texture.wrapT = SupEngine.THREE.RepeatWrapping;
          } else if (value === "mirroredRepeat") {
            texture.wrapS = SupEngine.THREE.MirroredRepeatWrapping;
            texture.wrapT = SupEngine.THREE.MirroredRepeatWrapping;
          }
          texture.needsUpdate = true;
        }
        break;
    }
  }

  server_setMaps(client: SupCore.RemoteClient, maps: any, callback: SetMapsCallback) {
    if (maps == null || typeof maps !== "object") { callback("Maps must be an object"); return; }

    for (const key in maps) {
      const value = maps[key];
      if (this.pub.maps[key] == null) { callback(`The map ${key} doesn't exist`); return; }
      if (value != null && !(value instanceof Buffer)) { callback(`Value for ${key} must be an ArrayBuffer or null`); return; }
    }

    for (const key in maps) this.pub.maps[key] = maps[key];

    callback(null, null, maps);
    this.emit("change");
  }

  client_setMaps(maps: any) {
    for (const key in maps) this.pub.maps[key] = maps[key];
    this.loadTextures();
  }

  server_newMap(client: SupCore.RemoteClient, name: string, callback: NewMapCallback) {
    if (name == null || typeof name !== "string") { callback("Name of the map must be a string"); return; }
    if (this.pub.maps[name] != null) { callback(`The map ${name} already exists`); return; }

    this.pub.maps[name] = new Buffer(0);
    callback(null, null, name);
    this.emit("change");
  }

  client_newMap(name: string) {
    this.pub.maps[name] = new Buffer(0);
  }

  server_deleteMap(client: SupCore.RemoteClient, name: string, callback: DeleteMapCallback) {
    if (name == null || typeof name !== "string") { callback("Name of the map must be a string"); return; }
    if (this.pub.maps[name] == null) { callback(`The map ${name} doesn't exist`); return; }

    if (this.pub.mapSlots["map"] === name) { callback(`The main map can't be deleted`); return; }

    this.client_deleteMap(name);
    callback(null, null, name);
    this.emit("change");
  }

  client_deleteMap(name: string) {
    for (const slotName in this.pub.mapSlots) {
      const map = this.pub.mapSlots[slotName];
      if (map === name) this.pub.mapSlots[slotName] = null;
    }

    // NOTE: do not delete, the key must exist so the file can be deleted from the disk when the asset is saved
    this.pub.maps[name] = null;
  }

  server_renameMap(client: SupCore.RemoteClient, oldName: string, newName: string, callback: RenameMapCallback) {
    if (oldName == null || typeof oldName !== "string") { callback("Name of the map must be a string"); return; }
    if (newName == null || typeof newName !== "string") { callback("New name of the map must be a string"); return; }
    if (this.pub.maps[newName] != null) { callback(`The map ${newName} already exists`); return; }

    this.client_renameMap(oldName, newName);
    callback(null, null, oldName, newName);
    this.emit("change");
  }

  client_renameMap(oldName: string, newName: string) {
    this.pub.maps[newName] = this.pub.maps[oldName];
    this.pub.maps[oldName] = null;

    for (const slotName in this.pub.mapSlots) {
      const map = this.pub.mapSlots[slotName];
      if (map === oldName) this.pub.mapSlots[slotName] = newName;
    }
  }

  server_setMapSlot(client: SupCore.RemoteClient, slot: string, map: string, callback: SetMapSlotCallback) {
    if (slot == null || typeof slot !== "string") { callback("Name of the slot must be a string"); return; }
    if (map != null && typeof map !== "string") { callback("Name of the map must be a string"); return; }
    if (map != null && this.pub.maps[map] == null) { callback(`The map ${map} doesn't exist`); return; }
    if (slot === "map" && map == null) { callback(`The main map can't be empty`); return; }

    this.pub.mapSlots[slot] = map;
    callback(null, null, slot, map);
    this.emit("change");
  }

  client_setMapSlot(slot: string, map: string) {
    this.pub.mapSlots[slot] = map;
  }

  server_newAnimation(client: SupCore.RemoteClient, name: string, callback: NewAnimationCallback) {
    const animation: SpriteAnimationPub = { id: null, name, startFrameIndex: 0, endFrameIndex: 0, speed: 1 };

    this.animations.add(animation, null, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      animation.name = SupCore.Data.ensureUniqueName(animation.id, animation.name, this.animations.pub);

      callback(null, animation.id, animation, actualIndex);
      this.emit("change");
    });
  }

  client_newAnimation(animation: SpriteAnimationPub, actualIndex: number) {
    this.animations.client_add(animation, actualIndex);
  }

  server_deleteAnimation(client: SupCore.RemoteClient, id: string, callback: DeleteAnimationCallback) {
    this.animations.remove(id, (err) => {
      if (err != null) { callback(err); return; }

      callback(null, null, id);
      this.emit("change");
    });
  }

  client_deleteAnimation(id: string) {
    this.animations.client_remove(id);
    return;
  }

  server_moveAnimation(client: SupCore.RemoteClient, id: string, newIndex: number, callback: MoveAnimationCallback) {
    this.animations.move(id, newIndex, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      callback(null, null, id, actualIndex);
      this.emit("change");
    });
  }

  client_moveAnimation(id: string, newIndex: number) {
    this.animations.client_move(id, newIndex);
  }

  server_setAnimationProperty(client: SupCore.RemoteClient, id: string, key: string, value: any, callback: SetAnimationPropertyCallback) {
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

      callback(null, null, id, key, actualValue);
      this.emit("change");
    });
  }

  client_setAnimationProperty(id: string, key: string, actualValue: any) {
    this.animations.client_setProperty(id, key, actualValue);
  }
}
