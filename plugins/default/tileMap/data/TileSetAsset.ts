import * as path from "path";
import * as fs from "fs";

import TileMapSettingsResource from "./TileMapSettingsResource";

// Reference to THREE, client-side only
let THREE: typeof SupEngine.THREE;
if ((<any>global).window != null && (<any>window).SupEngine != null) THREE = SupEngine.THREE;

export interface TileSetAssetPub {
  formatVersion: number;
  image: Buffer|ArrayBuffer;
  grid: { width: number; height: number };
  tileProperties: { [tileName: string]: { [propertyName: string]: string} };
  texture?: THREE.Texture;
}

export default class TileSetAsset extends SupCore.Data.Base.Asset {
  static currentFormatVersion = 1;

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    image: { type: "buffer" },
    grid: {
      type: "hash",
      properties: {
        width: { type: "integer", min: 1, mutable: true },
        height: { type: "integer", min: 1, mutable: true }
      }
    },
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

  url: string;

  constructor(id: string, pub: TileSetAssetPub, server: ProjectServer) {
    super(id, pub, TileSetAsset.schema, server);
  }

  init(options: any, callback: Function) {
    this.server.data.resources.acquire("tileMapSettings", null, (err: Error, tileMapSettings: TileMapSettingsResource) => {
      this.server.data.resources.release("tileMapSettings", null);

      this.pub = {
        formatVersion: TileSetAsset.currentFormatVersion,

        image: new Buffer(0),
        grid: tileMapSettings.pub.grid,
        tileProperties: {}
      };

      super.init(options, callback);
    });
  }

  load(assetPath: string) {
    let pub: TileSetAssetPub;
    fs.readFile(path.join(assetPath, "tileset.json"), { encoding: "utf8" }, (err, json) => {
      if (err != null && err.code === "ENOENT") {
        fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
          fs.rename(path.join(assetPath, "asset.json"), path.join(assetPath, "tileset.json"), (err) => {
            pub = JSON.parse(json);
            fs.readFile(path.join(assetPath, "image.dat"), (err, buffer) => {
              pub.image = buffer;
              this._onLoaded(assetPath, pub);
            });
          });
        });
      } else {
        pub = JSON.parse(json);
        fs.readFile(path.join(assetPath, "image.dat"), (err, buffer) => {
          pub.image = buffer;
          this._onLoaded(assetPath, pub);
        });
      }
    });
  }

  migrate(assetPath: string, pub: TileSetAssetPub, callback: (hasMigrated: boolean) => void) {
    if (pub.formatVersion === TileSetAsset.currentFormatVersion) { callback(false); return; }

    if (pub.formatVersion == null) {
      // NOTE: gridSize was split into grid.width and .height in Superpowers 0.8
      if ((<any>pub)["gridSize"] != null) {
        pub.grid = { width: (<any>pub)["gridSize"], height: (<any>pub)["gridSize"]};
        delete (<any>pub)["gridSize"];
      }
      pub.formatVersion = 1;
    }

    callback(true);
  }

  client_load() { this.loadTexture(); }
  client_unload() { this.unloadTexture(); }

  save(assetPath: string, callback: (err: NodeJS.ErrnoException) => any) {
    let buffer = this.pub.image;
    delete this.pub.image;
    let json = JSON.stringify(this.pub, null, 2);
    this.pub.image = buffer;
    fs.writeFile(path.join(assetPath, "tileset.json"), json, { encoding: "utf8" }, () => {
      fs.writeFile(path.join(assetPath, "image.dat"), buffer, callback);
    });
  }

  private loadTexture() {
    this.unloadTexture();

    let buffer = this.pub.image as ArrayBuffer;
    if (buffer.byteLength === 0) return;

    let image = new Image;
    let texture = this.pub.texture = new THREE.Texture(image);

    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    let typedArray = new Uint8Array(buffer);
    let blob = new Blob([ typedArray ], { type: "image/*" });
    image.src = this.url = URL.createObjectURL(blob);

    if (!image.complete) image.addEventListener("load", () => { texture.needsUpdate = true; });
  }

  private unloadTexture() {
    if (this.url != null) URL.revokeObjectURL(this.url);
    if (this.pub.texture != null) this.pub.texture.dispose();

    this.url = null;
    this.pub.texture = null;
  }

  server_upload(client: SupCore.RemoteClient, image: Buffer, callback: (err: string, image: Buffer) => any) {
    if (!(image instanceof Buffer)) { callback("Image must be an ArrayBuffer", null); return; }

    this.pub.image = image;

    callback(null, image);
    this.emit("change");
  }

  client_upload(image: Buffer) {
    this.pub.image = image;
    this.loadTexture();
  }

  server_addTileProperty(client: SupCore.RemoteClient, tile: {x: number; y: number}, name: string,
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
    let violation = SupCore.Data.Base.getRuleViolation(properties, TileSetAsset.schema["tileProperties"].values, true);
    if (violation != null) { callback(`Invalid property: ${SupCore.Data.Base.formatRuleViolation(violation)}`, null, null); return; }

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

  server_renameTileProperty(client: SupCore.RemoteClient, tile: {x: number; y: number}, name: string, newName: string,
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
    let violation = SupCore.Data.Base.getRuleViolation(properties, TileSetAsset.schema["tileProperties"].values, true);
    if (violation != null) { callback(`Invalid property: ${SupCore.Data.Base.formatRuleViolation(violation)}`, null, null, null); return; }

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

  server_deleteTileProperty(client: SupCore.RemoteClient, tile: {x: number; y: number}, name: string,
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

  server_editTileProperty(client: SupCore.RemoteClient, tile: {x: number; y: number}, name: string, value: string,
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
    let violation = SupCore.Data.Base.getRuleViolation(properties, TileSetAsset.schema["tileProperties"].values, true);
    if (violation != null) { callback(`Invalid property: ${SupCore.Data.Base.formatRuleViolation(violation)}`, null, null, null); return; }

    this.pub.tileProperties[`${tile.x}_${tile.y}`][name] = value;
    callback(null, tile, name, value);
    this.emit("change");
  }

  client_editTileProperty(tile: {x: number; y: number}, name: string, value: string) {
    this.pub.tileProperties[`${tile.x}_${tile.y}`][name] = value;
  }
}
