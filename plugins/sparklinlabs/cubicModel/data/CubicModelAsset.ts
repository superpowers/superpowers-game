import * as path from "path";
import * as fs from "fs";
import * as async from "async";
import * as _ from "lodash";

import CubicModelNodes, { Node } from "./CubicModelNodes";

interface CubicModelAssetPub {
  unitRatio: number;
  nodes: Node[];
}

export default class CubicModelAsset extends SupCore.data.base.Asset {

  static schema = {
    unitRatio: { type: "integer", min: "1" },
    nodes: { type: "array" },
  };

  pub: CubicModelAssetPub;
  nodes: CubicModelNodes;

  constructor(id: string, pub: any, serverData: any) {
    super(id, pub, CubicModelAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.pub = { unitRatio: 16 /* TODO: get default from settings resource! */, nodes: [] };
    super.init(options, callback);
  }

  setup() {
    this.nodes = new CubicModelNodes(this.pub.nodes, this);
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "cubicModel.json"), { encoding: "utf8" }, (err, json) => {
      let pub: CubicModelAssetPub = JSON.parse(json);

      this.pub = pub;
      this.setup();
      this.emit("load");
    });
  }

  save(assetPath: string, saveCallback: Function) {
    let json = JSON.stringify(this.pub, null, 2);

    async.series<Error>([

      (callback) => { fs.writeFile(path.join(assetPath, "cubicModel.json"), json, { encoding: "utf8" }, (err) => { callback(err, null); }); },

    ], (err) => { saveCallback(err); });
  }

  /*
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
  */
}
