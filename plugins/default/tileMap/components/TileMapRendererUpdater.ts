import TileMap from "./TileMap";
import TileMapRenderer from "./TileMapRenderer";
import TileMapAsset from "../data/TileMapAsset";
import { TileMapLayerPub } from "../data/TileMapLayers";
import { TileMapRendererConfigPub } from "../componentConfigs/TileMapRendererConfig";

import TileSet from "./TileSet";
import TileSetAsset from "../data/TileSetAsset";

export default class TileMapRendererUpdater {
  tileMapAssetId: string;
  tileSetAssetId: string;
  materialType: string;
  shaderAssetId: string;
  shaderPub: any;

  tileSetSubscriber: SupClient.AssetSubscriber;
  tileMapSubscriber: SupClient.AssetSubscriber;
  shaderSubscriber: SupClient.AssetSubscriber;

  tileMapAsset: TileMapAsset;
  tileSetAsset: TileSetAsset;

  constructor(private client: SupClient.ProjectClient, public tileMapRenderer: TileMapRenderer, config: TileMapRendererConfigPub,
  private externalSubscribers?: { tileMap?: SupClient.AssetSubscriber, tileSet?: SupClient.AssetSubscriber }) {
    this.tileMapAssetId = config.tileMapAssetId;
    this.tileSetAssetId = config.tileSetAssetId;
    this.materialType = config.materialType;
    this.shaderAssetId = config.shaderAssetId;
    this.tileMapRenderer.receiveShadow = config.receiveShadow;

    if (this.externalSubscribers == null) this.externalSubscribers = {};
    if (this.externalSubscribers.tileMap == null) this.externalSubscribers.tileMap = {};
    if (this.externalSubscribers.tileSet == null) this.externalSubscribers.tileSet = {};

    this.tileMapSubscriber = {
      onAssetReceived: this.onTileMapAssetReceived,
      onAssetEdited: this.onTileMapAssetEdited,
      onAssetTrashed: this.onTileMapAssetTrashed
    };

    this.tileSetSubscriber = {
      onAssetReceived: this.onTileSetAssetReceived,
      onAssetEdited: this.onTileSetAssetEdited,
      onAssetTrashed: this.onTileSetAssetTrashed
    };

    this.shaderSubscriber = {
      onAssetReceived: this.onShaderAssetReceived,
      onAssetEdited: this.onShaderAssetEdited,
      onAssetTrashed: this.onShaderAssetTrashed
    };

    if (this.tileMapAssetId != null) this.client.subAsset(this.tileMapAssetId, "tileMap", this.tileMapSubscriber);
    if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
  }

  destroy() {
    if (this.tileMapAssetId != null) this.client.unsubAsset(this.tileMapAssetId, this.tileMapSubscriber);
    if (this.tileSetAssetId != null) this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);
    if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
  }

  private setTileMap() {
    if (this.tileMapAsset == null || (this.materialType === "shader" && this.shaderPub == null)) {
      this.tileMapRenderer.setTileMap(null);
      return;
    }

    this.tileMapRenderer.setTileMap(new TileMap(this.tileMapAsset.pub), this.materialType, this.shaderPub);
  }

  private onTileMapAssetReceived = (assetId: string, asset: TileMapAsset) => {
    this.tileMapAsset = asset;
    this.setTileMap();

    if (this.tileMapAsset.pub.tileSetId != null) this.client.subAsset(this.tileMapAsset.pub.tileSetId, "tileSet", this.tileSetSubscriber);

    const subscriber = this.externalSubscribers.tileMap;
    if (subscriber.onAssetReceived != null) subscriber.onAssetReceived(assetId, asset);
  };

  private onTileMapAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    if (this.tileSetAsset != null || command === "changeTileSet") {
      const commandFunction = this.onEditCommands[command];
      if (commandFunction != null) commandFunction.apply(this, args);
    }

    const subscriber = this.externalSubscribers.tileMap;
    if (subscriber.onAssetEdited) subscriber.onAssetEdited(assetId, command, ...args);
  };

  private onEditCommands: { [command: string]: Function; } = {
    changeTileSet: () => {
      if (this.tileSetAssetId != null) this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);

      this.tileSetAsset = null;
      this.tileMapRenderer.setTileSet(null);

      this.tileSetAssetId = this.tileMapAsset.pub.tileSetId;
      if (this.tileSetAssetId != null) this.client.subAsset(this.tileSetAssetId, "tileSet", this.tileSetSubscriber);
    },

    resizeMap: () => { this.setTileMap(); },
    moveMap: () => { this.tileMapRenderer.refreshEntireMap(); },

    setProperty: (path: string, value: any) => {
      switch (path) {
        case "pixelsPerUnit": this.tileMapRenderer.refreshPixelsPerUnit(value); break;
        case "layerDepthOffset": this.tileMapRenderer.refreshLayersDepth(); break;
      }
    },

    editMap: (layerId: string, edits: { x: number, y: number }[]) => {
      let index = this.tileMapAsset.pub.layers.indexOf(this.tileMapAsset.layers.byId[layerId]);
      for (let edit of edits) this.tileMapRenderer.refreshTileAt(index, edit.x, edit.y);
    },

    newLayer: (layer: TileMapLayerPub, index: number) => { this.tileMapRenderer.addLayer(layer.id, index); },
    deleteLayer: (id: string, index: number) => { this.tileMapRenderer.deleteLayer(index); },
    moveLayer: (id: string, newIndex: number) => { this.tileMapRenderer.moveLayer(id, newIndex); }
  };

  private onTileMapAssetTrashed = (assetId: string) => {
    this.tileMapRenderer.setTileMap(null);

    const subscriber = this.externalSubscribers.tileMap;
    if (subscriber.onAssetTrashed != null) subscriber.onAssetTrashed(assetId);
  };

  private onTileSetAssetReceived = (assetId: string, asset: TileSetAsset) => {
    this.prepareTexture(asset.pub.texture, () => {
      this.tileSetAsset = asset;

      this.tileMapRenderer.setTileSet(new TileSet(asset.pub));

      const subscriber = this.externalSubscribers.tileSet;
      if (subscriber.onAssetReceived != null) subscriber.onAssetReceived(assetId, asset);
    });
  };

  private prepareTexture(texture: THREE.Texture, callback: Function) {
    if (texture == null) {
      callback();
      return;
    }

    if (texture.image.complete) callback();
    else texture.image.addEventListener("load", callback);
  }

  private onTileSetAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    const commandFunction = this.onTileSetEditCommands[command];
    if (commandFunction != null) commandFunction.apply(this, args);

    const subscriber = this.externalSubscribers.tileSet;
    if (subscriber.onAssetEdited) subscriber.onAssetEdited(assetId, command, ...args);
  };

  private onTileSetEditCommands: { [command: string]: Function; } = {
    upload() {
      this.prepareTexture(this.tileSetAsset.pub.texture, () => {
        this.tileMapRenderer.setTileSet(new TileSet(this.tileSetAsset.pub));
      });
    },

    setProperty() {
      this.tileMapRenderer.setTileSet(new TileSet(this.tileSetAsset.pub));
    }
  };

  private onTileSetAssetTrashed = (assetId: string) => {
    this.tileMapRenderer.setTileSet(null);

    const subscriber = this.externalSubscribers.tileSet;
    if (subscriber.onAssetTrashed) subscriber.onAssetTrashed(assetId);
  };

  private onShaderAssetReceived = (assetId: string, asset: { pub: any} ) => {
    this.shaderPub = asset.pub;
    this.setTileMap();
  };

  private onShaderAssetEdited = (id: string, command: string, ...args: any[]) => {
    if (command !== "editVertexShader" && command !== "editFragmentShader") this.setTileMap();
  };

  private onShaderAssetTrashed = () => {
    this.shaderPub = null;
    this.setTileMap();
  };

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "tileMapAssetId":
        if (this.tileMapAssetId != null) this.client.unsubAsset(this.tileMapAssetId, this.tileMapSubscriber);
        this.tileMapAssetId = value;

        this.tileMapAsset = null;
        this.tileMapRenderer.setTileMap(null);

        if (this.tileSetAssetId != null) this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);
        this.tileSetAsset = null;
        this.tileMapRenderer.setTileSet(null);

        if (this.tileMapAssetId != null) this.client.subAsset(this.tileMapAssetId, "tileMap", this.tileMapSubscriber);
        break;
      // case "tileSetAssetId":

      case "castShadow":
        this.tileMapRenderer.setCastShadow(value);
        break;

      case "receiveShadow":
        this.tileMapRenderer.setReceiveShadow(value);
        break;

      case "materialType":
        this.materialType = value;
        this.setTileMap();
        break;

      case "shaderAssetId":
        if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
        this.shaderAssetId = value;

        this.shaderPub = null;
        this.tileMapRenderer.setTileMap(null);

        if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
        break;
    }
  }
}
