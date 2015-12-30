let THREE = SupEngine.THREE;
import TileMap from "./TileMap";
import TileMapRenderer from "./TileMapRenderer";
import TileMapAsset from "../data/TileMapAsset";
import { TileMapLayerPub } from "../data/TileMapLayers";

import TileSet from "./TileSet";
import TileSetAsset from "../data/TileSetAsset";

export default class TileMapRendererUpdater {

  client: SupClient.ProjectClient;
  tileMapRenderer: TileMapRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  tileMapAssetId: string;
  tileSetAssetId: string;
  materialType: string;
  shaderAssetId: string;
  shaderPub: any;

  tileMapSubscriber: {
    onAssetReceived: (assetId: string, asset: TileMapAsset) => any;
    onAssetEdited: (id: string, command: string, ...args: any[]) => any;
    onAssetTrashed: (assetId: string) => any
  };

  tileSetSubscriber: {
    onAssetReceived: (assetId: string, asset: TileSetAsset) => any;
    onAssetEdited: (id: string, command: string, ...args: any[]) => any;
    onAssetTrashed: (assetId: string) => any
  };

  shaderSubscriber = {
    onAssetReceived: this._onShaderAssetReceived.bind(this),
    onAssetEdited: this._onShaderAssetEdited.bind(this),
    onAssetTrashed: this._onShaderAssetTrashed.bind(this)
  };

  tileMapAsset: TileMapAsset;
  tileSetAsset: TileSetAsset;

  constructor(client: SupClient.ProjectClient, tileMapRenderer: TileMapRenderer, config: any, receiveAssetCallbacks?: any, editAssetCallbacks?: any) {
    this.client = client;
    this.tileMapRenderer = tileMapRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.tileMapAssetId = config.tileMapAssetId;
    this.tileSetAssetId = config.tileSetAssetId;
    this.materialType = config.materialType;
    this.shaderAssetId = config.shaderAssetId;

    this.tileMapSubscriber = {
      onAssetReceived: this._onTileMapAssetReceived,
      onAssetEdited: this._onTileMapAssetEdited,
      onAssetTrashed: this._onTileMapAssetTrashed
    }

    this.tileSetSubscriber = {
      onAssetReceived: this._onTileSetAssetReceived,
      onAssetEdited: this._onTileSetAssetEdited,
      onAssetTrashed: this._onTileSetAssetTrashed
    }

    this.tileMapRenderer.receiveShadow = config.receiveShadow;

    if (this.tileMapAssetId != null) this.client.subAsset(this.tileMapAssetId, "tileMap", this.tileMapSubscriber);
    if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
  }

  destroy() {
    if (this.tileMapAssetId != null) this.client.unsubAsset(this.tileMapAssetId, this.tileMapSubscriber);
    if (this.tileSetAssetId != null) { this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber); }
    if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
  }

  _setTileMap() {
    if (this.tileMapAsset == null || (this.materialType === "shader" && this.shaderPub == null)) {
      this.tileMapRenderer.setTileMap(null);
      return;
    }

    this.tileMapRenderer.setTileMap(new TileMap(this.tileMapAsset.pub), this.materialType, this.shaderPub);
  }

  _onTileMapAssetReceived = (assetId: string, asset: TileMapAsset) => {
    this.tileMapAsset = asset;
    this._setTileMap();

    if (this.tileMapAsset.pub.tileSetId != null)
      this.client.subAsset(this.tileMapAsset.pub.tileSetId, "tileSet", this.tileSetSubscriber);
    if (this.receiveAssetCallbacks != null && this.receiveAssetCallbacks.tileMap != null) this.receiveAssetCallbacks.tileMap();
  }

  _onTileMapAssetEdited = (id: string, command: string, ...args: any[]) => {
    if (this.tileSetAsset != null || command === "changeTileSet") {
      let commandFunction = (<any>this)[`_onEditCommand_${command}`];
      if (commandFunction != null) commandFunction.apply(this, args);
    }

    if (this.editAssetCallbacks != null && this.editAssetCallbacks.tileMap != null) {
      let editCallback = this.editAssetCallbacks.tileMap[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onEditCommand_changeTileSet() {
    if (this.tileSetAssetId != null) this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);

    this.tileSetAsset = null;
    this.tileMapRenderer.setTileSet(null);

    this.tileSetAssetId = this.tileMapAsset.pub.tileSetId;
    if (this.tileSetAssetId != null) this.client.subAsset(this.tileSetAssetId, "tileSet", this.tileSetSubscriber);
  }

  _onEditCommand_resizeMap() { this._setTileMap(); }

  _onEditCommand_moveMap() {
    this.tileMapRenderer.refreshEntireMap();
  }

  _onEditCommand_setProperty(path: string, value: any) {
    switch (path) {
      case "pixelsPerUnit": this.tileMapRenderer.refreshPixelsPerUnit(value); break;
      case "layerDepthOffset": this.tileMapRenderer.refreshLayersDepth(); break;
    }
  }

  _onEditCommand_editMap(layerId: string, edits: { x: number, y: number }[]) {
    let index = this.tileMapAsset.pub.layers.indexOf(this.tileMapAsset.layers.byId[layerId]);
    for (let edit of edits) this.tileMapRenderer.refreshTileAt(index, edit.x, edit.y);
  }

  _onEditCommand_newLayer(layer: TileMapLayerPub, index: number) {
    this.tileMapRenderer.addLayer(layer.id, index);
  }

  _onEditCommand_deleteLayer(id: string, index: number) {
    this.tileMapRenderer.deleteLayer(index);
  }

  _onEditCommand_moveLayer(id: string, newIndex: number) {
    this.tileMapRenderer.moveLayer(id, newIndex);
  }

  _onTileMapAssetTrashed = (assetId: string) => {
    this.tileMapRenderer.setTileMap(null);
    if (this.editAssetCallbacks != null) {
      // FIXME: We should probably have a this.trashAssetCallback instead
      // and let editors handle things how they want
      SupClient.onAssetTrashed();
    }
  }

  _onTileSetAssetReceived = (assetId: string, asset: TileSetAsset) => {
    this._prepareTexture(asset.pub.texture, () => {
      this.tileSetAsset = asset;

      this.tileMapRenderer.setTileSet(new TileSet(asset.pub));
      if (this.receiveAssetCallbacks != null && this.receiveAssetCallbacks.tileSet != null) this.receiveAssetCallbacks.tileSet();
    })

  };

  _prepareTexture(texture: THREE.Texture, callback: Function) {
    if (texture == null) {
      callback();
      return;
    }

    if (texture.image.complete) callback();
    else texture.image.addEventListener("load", callback);
  }

  _onTileSetAssetEdited = (id: string, command: string, ...args: any[]) => {
    let commandFunction = (<any>this)[`_onTileSetEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null && this.editAssetCallbacks.tileSet != null) {
      let editCallback = this.editAssetCallbacks.tileSet[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onTileSetEditCommand_upload() {
    this._prepareTexture(this.tileSetAsset.pub.texture, () => {
      this.tileMapRenderer.setTileSet(new TileSet(this.tileSetAsset.pub));
    });
  }

  _onTileSetEditCommand_setProperty() {
    this.tileMapRenderer.setTileSet(new TileSet(this.tileSetAsset.pub));
  }

  _onTileSetAssetTrashed = (assetId: string) => {
    this.tileMapRenderer.setTileSet(null);
  }

  _onShaderAssetReceived(assetId: string, asset: { pub: any} ) {
    this.shaderPub = asset.pub;
    this._setTileMap();
  }

  _onShaderAssetEdited(id: string, command: string, ...args: any[]) {
    if (command !== "editVertexShader" && command !== "editFragmentShader") this._setTileMap();
  }

  _onShaderAssetTrashed() {
    this.shaderPub = null;
    this._setTileMap();
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "tileMapAssetId":
        if (this.tileMapAssetId != null) this.client.unsubAsset(this.tileMapAssetId, this.tileMapSubscriber);
        this.tileMapAssetId = value;

        this.tileMapAsset = null;
        this.tileMapRenderer.setTileMap(null);

        if (this.tileSetAssetId != null) this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber)
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
        this._setTileMap();
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
