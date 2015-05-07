import * as path from "path";
import * as fs from "fs";

import TileMapSettingsResource from "./TileMapSettingsResource";

interface TileSetAssetPub {
  image: Buffer;
  gridSize: number;
  tileProperties: { [tileName: string]: { [propertyName: string]: string} };
  domImage?: any;
}

export default class TileSetAsset extends SupCore.data.base.Asset {

  static schema = {
    image: { type: "buffer" },
    gridSize: { type: "integer", min: 1, mutable: true },
    tileProperties: {
      type: "hash",
      values: {
        type: "hash",
        keys: { minLength: 1, maxLength: 80 },
        values: { type: "string", minLength: 0, maxLength: 80 }
      }
    }
  };

  pub: TileSetAssetPub;

  constructor(id: string, pub: TileSetAssetPub, serverData: any) {
    super(id, pub, TileSetAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.serverData.resources.acquire("tileMapSettings", null, (err: Error, tileMapSettings: TileMapSettingsResource) => {
      this.pub = {
        image: new Buffer(0),
        gridSize: tileMapSettings.pub.gridSize,
        tileProperties: {}
      };

      super.init(options, callback);
    });
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
      this.pub = JSON.parse(json);
      fs.readFile(path.join(assetPath, "image.dat"), (err, buffer) => {
        this.pub.image = buffer;
        this.setup();
        this.emit("load");
      });
    });
  }

  save(assetPath: string, callback: (err: NodeJS.ErrnoException) => any) {
    let buffer = this.pub.image;
    delete this.pub.image;
    let json = JSON.stringify(this.pub, null, 2);
    this.pub.image = buffer;
    fs.writeFile(path.join(assetPath, "asset.json"), json, { encoding: "utf8" }, () => {
      fs.writeFile(path.join(assetPath, "image.dat"), buffer, callback);
    });
  }

  server_upload(client: any, image: Buffer, callback: (err: string, image: Buffer) => any) {
    if (! (image instanceof Buffer)) { callback("Image must be an ArrayBuffer", null); return; }

    this.pub.image = image;

    callback(null, image);
    this.emit("change");
  }

  client_upload(image: Buffer) {
    this.pub.image = image;
  }

  server_addTileProperty(client: any, tile: {x: number; y: number}, name: string,
  callback: (err: string, tile: {x: number; y: number}, name: string) => any) {

    if (typeof(tile) !== "object" ||
    tile.x == null || typeof(tile.x) !== "number" ||
    tile.y == null || typeof(tile.y) !== "number") {

      callback("Invalid tile location", null, null);
      return;
    }

    if (typeof(name) !== "string") { callback("Invalid property name", null, null); return; }

    let properties: { [name: string]: string} = {};
    properties[name] = "";
    let violation = SupCore.data.base.getRuleViolation(properties, TileSetAsset.schema.tileProperties.values, true);
    if (violation != null) { callback(`Invalid property: ${SupCore.data.base.formatRuleViolation(violation)}`, null, null); return; }

    if (this.pub.tileProperties[`${tile.x}_${tile.y}`] != null &&
    this.pub.tileProperties[`${tile.x}_${tile.y}`][name] != null) {

      callback(`Property ${name} already exists`, null, null);
      return;
    }

    if (this.pub.tileProperties[`${tile.x}_${tile.y}`] == null) this.pub.tileProperties[`${tile.x}_${tile.y}`] = {};
    this.pub.tileProperties[`${tile.x}_${tile.y}`][name] = "";
    callback(null, tile, name);
    this.emit("change");
  }

  client_addTileProperty(tile: {x: number; y: number}, name: string) {
    if (this.pub.tileProperties[`${tile.x}_${tile.y}`] == null) this.pub.tileProperties[`${tile.x}_${tile.y}`] = {};
    this.pub.tileProperties[`${tile.x}_${tile.y}`][name] = "";
  }

  server_renameTileProperty(client: any, tile: {x: number; y: number}, name: string, newName: string,
  callback: (err: string, tile: {x: number; y: number}, name: string, newName: string) => any) {
    if (typeof(tile) !== "object" ||
    tile.x == null || typeof(tile.x) !== "number" ||
    tile.y == null || typeof(tile.y) !== "number") {

      callback("Invalid tile location", null, null, null);
      return;
    }

    if (typeof(name) !== "string") { callback("Invalid property name", null, null, null); return; }
    if (typeof(newName) !== "string") { callback("Invalid new property name", null, null, null); return; }

    if (this.pub.tileProperties[`${tile.x}_${tile.y}`] == null) { callback(`Tile ${tile.x}_${tile.y} doesn't have any property`, null, null, null); return; }

    let properties: { [name: string]: string} = {};
    properties[newName] = "";
    let violation = SupCore.data.base.getRuleViolation(properties, TileSetAsset.schema.tileProperties.values, true);
    if (violation != null) { callback(`Invalid property: ${SupCore.data.base.formatRuleViolation(violation)}`, null, null, null); return; }

    if (this.pub.tileProperties[`${tile.x}_${tile.y}`][name] == null) { callback(`Property ${name} doesn't exists`, null, null, null); return; }
    if (this.pub.tileProperties[`${tile.x}_${tile.y}`][newName] != null) { callback(`Property ${newName} already exists`, null, null, null); return; }

    this.pub.tileProperties[`${tile.x}_${tile.y}`][newName] = this.pub.tileProperties[`${tile.x}_${tile.y}`][name];
    delete this.pub.tileProperties[`${tile.x}_${tile.y}`][name];
    callback(null, tile, name, newName);
    this.emit("change");
  }

  client_renameTileProperty(tile: {x: number; y: number}, name: string, newName: string) {
    this.pub.tileProperties[`${tile.x}_${tile.y}`][newName] = this.pub.tileProperties[`${tile.x}_${tile.y}`][name];
    delete this.pub.tileProperties[`${tile.x}_${tile.y}`][name];
  }

  server_deleteTileProperty(client: any, tile: {x: number; y: number}, name: string,
  callback: (err: string, tile: {x: number; y: number}, name: string) => any) {

    if (typeof(tile) !== "object" ||
    tile.x == null || typeof(tile.x) !== "number" ||
    tile.y == null || typeof(tile.y) !== "number") {

      callback("Invalid tile location", null, null);
      return;
    }

    if (this.pub.tileProperties[`${tile.x}_${tile.y}`] == null) { callback(`Tile ${tile.x}_${tile.y} doesn't have any property`, null, null); return; }
    if (typeof(name) !== "string") { callback("Invalid property name", null, null); return; }

    if (this.pub.tileProperties[`${tile.x}_${tile.y}`][name] == null) { callback(`Property ${name} doesn't exists`, null, null); return; }

    delete this.pub.tileProperties[`${tile.x}_${tile.y}`][name];
    if (Object.keys(this.pub.tileProperties[`${tile.x}_${tile.y}`]).length === 0)
      delete this.pub.tileProperties[`${tile.x}_${tile.y}`];

    callback(null, tile, name);
    this.emit("change");
  }

  client_deleteTileProperty(tile: {x: number; y: number}, name: string) {
    delete this.pub.tileProperties[`${tile.x}_${tile.y}`][name];
    if (Object.keys(this.pub.tileProperties[`${tile.x}_${tile.y}`]).length === 0)
      delete this.pub.tileProperties[`${tile.x}_${tile.y}`];
  }

  server_editTileProperty(client: any, tile: {x: number; y: number}, name: string, value: string,
  callback: (err: string, tile: {x: number; y: number}, name: string, value: string) => any) {

    if (typeof(tile) !== "object" ||
    tile.x == null || typeof(tile.x) !== "number" ||
    tile.y == null || typeof(tile.y) !== "number") {

      callback("Invalid tile location", null, null, null);
      return;
    }

    if (this.pub.tileProperties[`${tile.x}_${tile.y}`] == null) { callback(`Tile ${tile.x}_${tile.y} doesn't have any property`, null, null, null); return; }
    if (typeof(name) !== "string") { callback("Invalid property name", null, null, null); return; }
    if (this.pub.tileProperties[`${tile.x}_${tile.y}`][name] == null) { callback(`Property ${name} doesn't exists`, null, null, null); return; }
    if (typeof(value) !== "string") { callback("Invalid property value", null, null, null); return; }

    let properties: { [name: string]: string } = {};
    properties[name] = value;
    let violation = SupCore.data.base.getRuleViolation(properties, TileSetAsset.schema.tileProperties.values, true);
    if (violation != null) { callback(`Invalid property: ${SupCore.data.base.formatRuleViolation(violation)}`, null, null, null); return; }

    this.pub.tileProperties[`${tile.x}_${tile.y}`][name] = value;
    callback(null, tile, name, value);
    this.emit("change");
  }

  client_editTileProperty(tile: {x: number; y: number}, name: string, value: string) {
    this.pub.tileProperties[`${tile.x}_${tile.y}`][name] = value;
  }
}
