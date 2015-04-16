///<reference path="../../SupEngine/SupEngine.d.ts"/>

import SupRuntime = require("./index");
import async = require("async");

interface Asset {
  id: string;
  name: string;
  type: string;
  children?: any[];
}

class Player {

  static updateInterval = 1 / SupEngine.GameInstance.framesPerSecond * 1000;
  static maxAccumulatedTime = 5 * Player.updateInterval;

  canvas: HTMLCanvasElement;
  dataURL: string;

  gameInstance: SupEngine.GameInstance;

  entriesById: {[name: string]: any} = {};
  entriesByPath: {[name: string]: any} = {};
  resources: {[name: string]: any} = {};

  _assetsById: {[name: string]: any} = {};
  outerAssetsById: {[name: string]: any} = {};

  resourcesToLoad: string[];

  assetsToLoad: Asset[];

  accumulatedTime: number;
  lastTimestamp: number;
  tickAnimationFrameId: number;

  constructor(canvas: HTMLCanvasElement, dataURL: string, options: {debug?: boolean;}) {
    this.canvas = canvas;
    this.dataURL = dataURL;

    this.gameInstance = new SupEngine.GameInstance(this.canvas, options);
  }

  load(progressCallback: (progress: number, total: number) => any, callback: any) {
    var progress = 0;

    var innerProgressCallback = () => {
      progress++;
      var total = this.resourcesToLoad.length + this.assetsToLoad.length;
      progressCallback(progress, total);
    }
    async.series([
      (cb) => { this._loadManifest(cb); },
      (cb) => { this._loadResources(innerProgressCallback, cb); },
      (cb) => { this._loadAssets(innerProgressCallback, cb); },
      (cb) => { this._initPlugins(cb); },
      (cb) => { this._startPlugins(cb); }
    ], callback);
  }

  _initPlugins(callback: any) {
    async.each(Object.keys(SupRuntime.plugins), (name: string, cb: Function) => {
      var plugin = SupRuntime.plugins[name];
      if (plugin.init != null) plugin.init(this, cb);
      else cb();
    }, callback);
  }

  _loadManifest(callback: any) {
    this.getAssetData("game.json", 'json', (err: any, gameData: {name: string; assets: Asset[]}) => {
      if (err != null) { callback(new Error("Failed to load game manifest")); return; }

      document.title = gameData.name;

      this.resourcesToLoad = Object.keys(SupRuntime.resourcePlugins);

      this.assetsToLoad = [];
      var walk = (asset: Asset, parent="") => {
        var children: string[];
        if (asset.children != null) {
          children = [];
          asset.children.forEach((child) => { children.push(child.name); });
        }
        this.assetsToLoad.push({ id: asset.id, name: `${parent}${asset.name}`, type: asset.type, children: children });
        parent += `${asset.name}/`;
        if (asset.children == null) return;
        asset.children.forEach((child) => { walk(child, parent); });
      }
      gameData.assets.forEach((asset) => { walk(asset); });

      callback();
    });
  }

  _loadResources(progressCallback: Function, callback: any) {
    if (this.resourcesToLoad.length === 0) { callback(); return; }
    var resourcesLoaded = 0;

    var onResourceLoaded = (err: any, resourceName: string, resource: any) => {
      if (err != null) { callback(new Error(`Failed to load resource ${resourceName}: ${err.message}`)); return; }

      this.resources[resourceName] = resource

      progressCallback();
      resourcesLoaded++;
      if (resourcesLoaded === this.resourcesToLoad.length) callback();
    }

    this.resourcesToLoad.forEach((resourceName) => {
      var plugin = SupRuntime.resourcePlugins[resourceName];
      if (plugin == null) {
        // This resource isn't meant to be loaded at runtime, skip
        onResourceLoaded(null, resourceName, null);
        return;
      }

      plugin.loadResource(this, resourceName, (err, data) => { onResourceLoaded(err, resourceName, data); });
    });
  }

  _loadAssets(progressCallback: Function, callback: any) {
    if (this.assetsToLoad.length === 0 ) { callback(); return; }
    var assetsLoaded = 0;

    var onAssetLoaded = (err: any, entry: any, asset: any) => {
      if (err != null) { callback(new Error(`Failed to load asset ${entry.name}: ${err.message}`)); return; }

      this.entriesById[entry.id] = entry;
      this.entriesByPath[entry.name] = entry;
      this._assetsById[entry.id] = asset;

      progressCallback();
      assetsLoaded++;
      if (assetsLoaded === this.assetsToLoad.length) callback();
    }

    this.assetsToLoad.forEach((entry) => {
      if (entry.children != null) {
        onAssetLoaded(null, entry, {});
        return;
      }

      var plugin = SupRuntime.plugins[entry.type];
      if (plugin == null || plugin.loadAsset == null) {
        console.warn(`Don't know how to load assets of type '${entry.type}'`);
        onAssetLoaded(null, entry, {});
        return;
      }

      plugin.loadAsset(this, entry, (err, data) => { onAssetLoaded(err, entry, data); });
    });
  }

  _startPlugins(callback: any) {
    async.each(Object.keys(SupRuntime.plugins), (name, cb) => {
      var plugin = SupRuntime.plugins[name];
      if (plugin.start != null) plugin.start(this, cb);
      else cb();
    }, callback);
  }

  run() {
    this.lastTimestamp = 0;
    this.accumulatedTime = 0;
    this.canvas.focus();
    this.tick();
  }

  tick(timestamp?: number) {
    timestamp |= 0;
    this.accumulatedTime += timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // If the game is running slowly, don't fall into the well of dispair
    if (this.accumulatedTime > Player.maxAccumulatedTime) this.accumulatedTime = Player.maxAccumulatedTime;

    // Update
    var gameUpdated = false;
    while (this.accumulatedTime >= Player.updateInterval) {
      this.gameInstance.update();
      if (this.gameInstance.exited) return;
      this.accumulatedTime -= Player.updateInterval;
      gameUpdated = true;
    }

    // Render
    if (gameUpdated) this.gameInstance.draw();

    // Do it again soon
    this.tickAnimationFrameId = requestAnimationFrame((timestamp) => { this.tick(timestamp); });
  }

  getAssetData(path: string, responseType: string, callback: (err: Error, data?: any) => any) {
    var xhr = new XMLHttpRequest()
    xhr.open("GET", `${this.dataURL}${path}`, true);
    xhr.responseType = responseType;

    xhr.onload = (event) => {
      // Local file access returns status code 0
      if (xhr.status !== 200 && xhr.status !== 0) { callback(new Error(`Could not get ${path}`)); return; }

      // WORKAROUND: IE <= 11 does not support responseType = 'json'
      var response = xhr.response;
      if (xhr.responseType != 'json') {
        try { response = JSON.parse(response); }
        catch (e) {}
      }
      callback(null, response);
    }
    xhr.send();
  }

  getOuterAsset(assetId: number) {
    var outerAsset = this.outerAssetsById[assetId];
    var asset = this._assetsById[assetId];
    var entry = this.entriesById[assetId];

    if (outerAsset == null && asset != null) {
      if (entry.type == null) {
        outerAsset = { name: entry.name, type: "folder", children: entry.children };
      }
      else {
        var plugin = SupRuntime.plugins[this.entriesById[assetId].type];
        outerAsset = this.outerAssetsById[assetId] =
          // Temporary check until every asset is correctly handled
          (plugin.createOuterAsset != null) ? plugin.createOuterAsset(this, asset) : asset;

        outerAsset.name = entry.name;
        outerAsset.type = entry.type;
      }
    }

    return outerAsset;
  }

  createActor() { throw new Error("Player.createActor should be defined by a scripting plugin"); }
  createComponent() { throw new Error("Player.createComponent should be defined by a scripting plugin"); }
}

export = Player;
