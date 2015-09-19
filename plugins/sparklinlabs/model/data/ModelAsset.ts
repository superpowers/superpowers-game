import * as path from "path";
import * as fs from "fs";
import * as async from "async";
import * as _ from "lodash";

import ModelAnimations from "./ModelAnimations";
interface Animation {
  id?: string;
  name: string;
  duration: number;
  keyFrames: any;
}

interface ModelAssetPub {
  unitRatio: number;
  upAxisMatrix: number[];
  attributes: { [name: string]: Buffer; };
  bones: { name: string; parentIndex: number; matrix: number[] }[];
  textures?: { [name: string]: any; };
  maps: { [name: string]: Buffer; };
  filtering: string;
  wrapping: string;

  animations: Animation[];

  opacity: number;

  advancedTextures: boolean;
  mapSlots: { [name: string]: string; };
}

export default class ModelAsset extends SupCore.data.base.Asset {

  static schema = {
    unitRatio: { type: "number", min: 1, mutable: true },
    upAxisMatrix: { type: "array", length: 16, items: { type: "number" } },
    attributes: {
      type: "hash",
      properties: {
        position:   { type: "buffer?", mutable: true },
        index:      { type: "buffer?", mutable: true },
        color:      { type: "buffer?", mutable: true },
        uv:         { type: "buffer?", mutable: true },
        normal:     { type: "buffer?", mutable: true },
        skinIndex:  { type: "buffer?", mutable: true },
        skinWeight: { type: "buffer?", mutable: true }
      }
    },
    bones: {
      type: "array",
      items: {
        type: "hash",
        properties: <{ [index: string]: SupCore.data.base.Rule }> {
          name: { type: "string", minLength: 1, maxLength: 80 },
          parentIndex: { type: "integer?" },
          matrix: { type: "array", length: 16, items: { type: "number" } }
        }
      }
    },

    // TODO: Material

    maps: {
      type: "hash",
      values: { type: "buffer?" }
    },
    filtering: { type: "enum", items: [ "pixelated", "smooth"], mutable: true },
    wrapping: { type: "enum", items: [ "clampToEdge", "repeat", "mirroredRepeat"], mutable: true },
    animations: { type: "array" },

    opacity: { type: "number?", min: 0, max: 1, mutable: true },

    advancedTextures: { type: "boolean", mutable: true },

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

  animations: ModelAnimations;
  pub: ModelAssetPub;

  constructor(id: string, pub: any, serverData: any) {
    super(id, pub, ModelAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.pub = {
      unitRatio: 1,
      upAxisMatrix: null,
      attributes: {
        position: null,
        index: null,
        color: null,
        uv: null,
        normal: null,
        skinIndex:  null,
        skinWeight: null
      },
      bones: null,
      maps: { map: new Buffer(0) },
      filtering: "pixelated",
      wrapping: "clampToEdge",
      animations: [],
      opacity: null,

      advancedTextures: false,
      mapSlots: {
        map: "map",
        light: null,
        specular: null,
        alpha: null,
        normal: null
      }
    };

    super.init(options, callback);
  }

  setup() {
    this.animations = new ModelAnimations(this.pub.animations);
  }

  load(assetPath: string) {
    let pub: ModelAssetPub;

    let loadAttributesMaps = () => {
      // TODO: Remove these at some point, new config setting introduced in Superpowers 0.8
      if (typeof pub.opacity === "undefined") pub.opacity = 1;

      // TODO: Remove these at some point, asset migration introduced in Superpowers 0.11
      let maps: string[] = <any>pub.maps;
      if (maps.length === 1 && maps[0] === "diffuse") (<any>pub).maps = ["map"];
      if (pub.advancedTextures == null) {
        pub.advancedTextures = false;
        pub.mapSlots = {
          map: "map",
          light: null,
          specular: null,
          alpha: null,
          normal: null
        }
      }
      if (pub.unitRatio == null) pub.unitRatio = 1;

      // TODO: Remove these at some point, asset migration introduced in Superpowers 0.13
      if (pub.filtering == null) pub.filtering = "pixelated";
      if (pub.wrapping == null) pub.wrapping = "clampToEdge";

      pub.attributes = {};
      let mapsName: string[] = _.clone(<any>pub.maps);
      pub.maps = {};
      if (pub.animations == null) pub.animations = [];

      async.series([

        (callback) => {
            async.each(Object.keys(ModelAsset.schema.attributes.properties), (key, cb) => {
                fs.readFile(path.join(assetPath, `attr-${key}.dat`), (err, buffer) => {
                    // TODO: Handle error but ignore ENOENT
                    if (err != null) { cb(); return; }
                    pub.attributes[key] = buffer;
                    cb();
                });
            }, (err) => { callback(err, null); });
        },

        (callback) => {
          async.each(mapsName, (key, cb) => {
            fs.readFile(path.join(assetPath, `map-${key}.dat`), (err, buffer) => {
              // TODO: Handle error but ignore ENOENT
              if (err != null) {
                // TODO: Remove these at some point, asset migration introduced in Superpowers 0.11
                if (err.code === "ENOENT" && key === "map") {
                  fs.readFile(path.join(assetPath, `map-diffuse.dat`), (err, buffer) => {
                    pub.maps[key] = buffer;
                    fs.writeFile(path.join(assetPath, `map-map.dat`), buffer);
                    fs.unlink(path.join(assetPath, `map-diffuse.dat`));
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
    }

    fs.readFile(path.join(assetPath, "model.json"), { encoding: "utf8" }, (err, json) => {
      // TODO: Remove these at some point, asset migration introduced in Superpowers 0.11
      if (err != null && err.code === "ENOENT") {
        fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
          fs.rename(path.join(assetPath, "asset.json"), path.join(assetPath, "model.json"), (err) => {
            pub = JSON.parse(json);
            loadAttributesMaps();
          });
        });
      } else {
        pub = JSON.parse(json);
        loadAttributesMaps();
      }
    });

    /*(callback) => {
      async.each(this.pub.animations, (animation, cb) => {
        fs.readFile(path.join(assetPath, `anim-${animation.id}.dat`), (err, buffer) => { ... });
      });
    } */
  }

  save(assetPath: string, saveCallback: Function) {
    let attributes: any = this.pub.attributes;
    let maps = this.pub.maps;

    (<any>this.pub).attributes = [];
    for (let key in attributes) {
      if (attributes[key] != null) (<any>this.pub).attributes.push(key);
    }

    (<any>this.pub).maps = []
    for (let key in maps) {
      if (maps[key] != null) (<any>this.pub).maps.push(key);
    }

    let json = JSON.stringify(this.pub, null, 2);
    this.pub.attributes = attributes;
    this.pub.maps = maps;

    async.series([

      (callback) => { fs.writeFile(path.join(assetPath, "model.json"), json, { encoding: "utf8" }, (err) => { callback(err, null); }); },

      (callback) => {
        async.each(Object.keys(ModelAsset.schema.attributes.properties), (key, cb) => {
          let value = attributes[key];

          if (value == null) {
            fs.unlink(path.join(assetPath, `attr-${key}.dat`), (err) => {
              if (err != null && err.code !== "ENOENT") { cb(err); return; }
              cb();
            });
            return;
          }

          fs.writeFile(path.join(assetPath, `attr-${key}.dat`), value, cb);
        }, (err) => { callback(err, null); });
      },

      (callback) => {
        async.each(Object.keys(maps), (key, cb) => {
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

  server_setModel(client: any, upAxisMatrix: number[], attributes: { [name: string]: any }, bones: any[], callback: (err: string, upAxisMatrix?: number[], attributes?: { [name: string]: any }, bones?: any[]) => any) {
    // Validate up matrix
    if (upAxisMatrix != null) {
      let violation = SupCore.data.base.getRuleViolation(upAxisMatrix, ModelAsset.schema.upAxisMatrix, true);
      if (violation != null) { callback(`Invalid up axis matrix: ${SupCore.data.base.formatRuleViolation(violation)}`); return; }
    }

    // Validate attributes
    if (attributes == null || typeof attributes !== "object") { callback("Attributes must be an object"); return; }

    for (let key in attributes) {
      let value = attributes[key];
      if ((<any>ModelAsset.schema.attributes.properties)[key] == null) { callback(`Unsupported attribute type: ${key}`); return; }
      if (value != null && !(value instanceof Buffer)) { callback(`Value for ${key} must be an ArrayBuffer or null`); return; }
    }

    // Validate bones
    if (bones != null) {
      let violation = SupCore.data.base.getRuleViolation(bones, ModelAsset.schema.bones, true);
      if (violation != null) { callback(`Invalid bones: ${SupCore.data.base.formatRuleViolation(violation)}`); return; }
    }

    // Apply changes
    this.pub.upAxisMatrix = upAxisMatrix;
    this.pub.attributes = attributes;
    this.pub.bones = bones;

    callback(null, upAxisMatrix, attributes, bones);
    this.emit("change");
  }

  client_setModel(upAxisMatrix: number[], attributes: { [name: string]: any }, bones: any[]) {
    this.pub.upAxisMatrix = upAxisMatrix;
    this.pub.attributes = attributes;
    this.pub.bones = bones;
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

    this.client_deleteMap(name);
    callback(null, name);
    this.emit("change");
  }

  client_deleteMap(name: string) {
    for (let slotName in this.pub.mapSlots) {
      let map = this.pub.mapSlots[slotName];
      if (map === name) this.pub.mapSlots[slotName] = null;
    }

    //NOTE: do not delete, the key must exist so the file can be deleted from the disk when the asset is saved
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

    this.pub.mapSlots[slot] = map;
    callback(null, slot, map);
    this.emit("change");
  }

  client_setMapSlot(slot: string, map: string) {
    this.pub.mapSlots[slot] = map;
  }

  // Animations
  server_newAnimation(client: any, name: string, duration: number, keyFrames: any, callback: (err: string, animation?: Animation, actualIndex?: number) => any) {
    if (duration == null) duration = 0;
    if (keyFrames == null) keyFrames = [];
    let animation: Animation = { name, duration, keyFrames };

    this.animations.add(animation, null, (err, actualIndex) => {
      if (err != null) { callback(err); return; }

      animation.name = SupCore.data.ensureUniqueName(animation.id, animation.name, this.animations.pub);

      callback(null, animation, actualIndex);
      this.emit("change");
    });
  }

  client_newAnimation(animation: any, actualIndex: number) {
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
      if (typeof value !== "string") { callback("Invalid value"); return; }
      value = value.trim();

      if (SupCore.data.hasDuplicateName(id, value, this.animations.pub)) {
        callback("There's already an animation with this name"); return;
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

  server_setAnimation(client: any, id: string, duration: number, keyFrames: any, callback: (err: string, id?: string, duration?: number, keyFrames?: any) => any) {
    let violation = SupCore.data.base.getRuleViolation(duration, ModelAnimations.schema.duration, true);
    if (violation != null) { callback(`Invalid duration: ${SupCore.data.base.formatRuleViolation(violation)}`); return; }

    violation = SupCore.data.base.getRuleViolation(keyFrames, ModelAnimations.schema.keyFrames, true);
    if (violation != null) { callback(`Invalid duration: ${SupCore.data.base.formatRuleViolation(violation)}`); return; }

    let animation = this.animations.byId[id];
    if (animation == null) { callback(`Invalid animation id: ${id}`); return }

    animation.duration = duration;
    animation.keyFrames = keyFrames;

    callback(null, id, duration, keyFrames);
    this.emit("change");
  }

  client_setAnimation(id: string, duration: number, keyFrames: any) {
    let animation = this.animations.byId[id];

    animation.duration = duration;
    animation.keyFrames = keyFrames;
  }
}
