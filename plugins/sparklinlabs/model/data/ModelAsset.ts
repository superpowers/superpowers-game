import * as path from "path";
import * as fs from "fs";
import * as async from "async";

import ModelAnimations from "./ModelAnimations";
interface Animation {
  id?: string;
  name: string;
  duration: number;
  keyFrames: any;
}

export default class ModelAsset extends SupCore.data.base.Asset {

  static schema = {
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
      properties: {
        // TODO: Each map should have filters, etc.
        diffuse: { type: "buffer?", mutable: true }
      }
    },
    animations: { type: "array" },
    
    opacity: { type: "number?", min: 0, max: 1, mutable: true }
  };

  animations: ModelAnimations;

  constructor(id: string, pub: any, serverData: any) {
    super(id, pub, ModelAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.pub = {
      attributes: { position: null, index: null, color: null, uv: null, normal: null },
      bones: null,
      maps: { diffuse: null },
      animations: [],
      opacity: null
    };

    super.init(options, callback);
  }

  setup() {
    this.animations = new ModelAnimations(this.pub.animations);
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      this.pub = JSON.parse(json);
      
      // TODO: Remove these at some point, new config setting introduced in Superpowers 0.8
      if (typeof this.pub.opacity === "undefined") this.pub.opacity = 1;

      this.pub.attributes = {};
      this.pub.maps = {};
      if (this.pub.animations == null) this.pub.animations = [];

      async.series([

        (callback) => {
            async.each(Object.keys(ModelAsset.schema.attributes.properties), (key, cb) => {
                fs.readFile(path.join(assetPath, `attr-${key}.dat`), (err, buffer) => {
                    // TODO: Handle error but ignore ENOENT
                    if (err != null) { cb(); return; }
                    this.pub.attributes[key] = buffer;
                    cb();
                });
            }, (err) => { callback(err, null); });
        },

        (callback) => {
          async.each(Object.keys(ModelAsset.schema.maps.properties), (key, cb) => {
            fs.readFile(path.join(assetPath, `map-${key}.dat`), (err, buffer) => {
              // TODO: Handle error but ignore ENOENT
              if (err != null) { cb(); return; }
              this.pub.maps[key] = buffer;
              cb();
            });
          }, (err) => { callback(err, null); });
        }

      ], (err) => {
        this.setup();
        this.emit("load");
      });
    });

    /*(callback) => {
      async.each(this.pub.animations, (animation, cb) => {
        fs.readFile(path.join(assetPath, `anim-${animation.id}.dat`), (err, buffer) => { ... });
      });
    } */
  }

  save(assetPath: string, saveCallback: Function) {
    let attributes = this.pub.attributes;
    let maps = this.pub.maps;

    this.pub.attributes = [];
    for (let key in attributes) {
      if (attributes[key] != null) this.pub.attributes.push(key);
    }

    this.pub.maps = [];
    for (let key in maps) {
      if (maps[key] != null) this.pub.maps.push(key);
    }

    let json = JSON.stringify(this.pub, null, 2);
    this.pub.attributes = attributes;
    this.pub.maps = maps;

    async.series<Error>([

      (callback) => { fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, (err) => { callback(err, null); }); },

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
        async.each(Object.keys(ModelAsset.schema.maps.properties), (key, cb) => {
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
      if ((<any>ModelAsset.schema.maps.properties)[key] == null) { callback(`Unsupported map type: ${key}`); return; }
      if (value != null && !(value instanceof Buffer)) { callback(`Value for ${key} must be an ArrayBuffer or null`); return; }
    }

    for (let key in maps) this.pub.maps[key] = maps[key];

    callback(null, maps);
    this.emit("change");
  }

  client_setMaps(maps: any) {
    for (let key in maps) this.pub.maps[key] = maps[key];
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
