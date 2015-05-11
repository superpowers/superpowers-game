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
  url: string;

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

  tileMapAsset: TileMapAsset;
  tileSetAsset: TileSetAsset;
  tileSetThreeTexture: THREE.Texture;

  constructor(client: SupClient.ProjectClient, tileMapRenderer: TileMapRenderer, config: any, receiveAssetCallbacks?: any, editAssetCallbacks?: any) {
    this.client = client;
    this.tileMapRenderer = tileMapRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.tileMapAssetId = config.tileMapAssetId;
    this.tileSetAssetId = config.tileSetAssetId;
    this.tileSetThreeTexture = null

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

    if (this.tileMapAssetId != null) this.client.subAsset(this.tileMapAssetId, "tileMap", this.tileMapSubscriber);
  }

  destroy() {
    if (this.tileMapAssetId != null) this.client.unsubAsset(this.tileMapAssetId, this.tileMapSubscriber);
    if (this.tileSetAssetId != null) {
      this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);
      this.tileSetThreeTexture.dispose();
    }
  }

  _onTileMapAssetReceived = (assetId: string, asset: TileMapAsset) => {
    this.tileMapAsset = asset;
    this.tileMapRenderer.setTileMap(new TileMap(this.tileMapAsset.pub));

    if (this.tileMapAsset.pub.tileSetId != null)
      this.client.subAsset(this.tileMapAsset.pub.tileSetId, "tileSet", this.tileSetSubscriber);
    if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.tileMap();
  }

  _onTileMapAssetEdited = (id: string, command: string, ...args: any[]) => {
    let commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.tileMap[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onEditCommand_changeTileSet() {
    if (this.tileSetAssetId != null) {
      this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);
      this.tileSetThreeTexture.dispose();
      this.tileSetThreeTexture = null;
      this.tileSetAsset = null;
    }
    this.tileMapRenderer.setTileSet(null, null);

    this.tileSetAssetId = this.tileMapAsset.pub.tileSetId;
    if (this.tileSetAssetId != null) this.client.subAsset(this.tileSetAssetId, "tileSet", this.tileSetSubscriber);
  }

  _onEditCommand_resizeMap() {
    this.tileMapRenderer.setTileMap(new TileMap(this.tileMapAsset.pub));
  }

  _onEditCommand_moveMap() {
    this.tileMapRenderer.refreshEntireMap();
  }

  _onEditCommand_setProperty(path: string, value: any) {
    switch (path) {
      case "pixelsPerUnit": this.tileMapRenderer.refreshPixelsPerUnit(value); break;
      case "layerDepthOffset": this.tileMapRenderer.refreshLayersDepth(); break;
    }
  }

  _onEditCommand_editMap(layerId: string, x: number, y: number) {
    let index = this.tileMapAsset.pub.layers.indexOf(this.tileMapAsset.layers.byId[layerId]);
    this.tileMapRenderer.refreshTileAt(index, x, y);
  }

  _onEditCommand_newLayer(layer: TileMapLayerPub, index: number) {
    this.tileMapRenderer.addLayer(layer, index);
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
    this.tileSetAsset = asset;

    if (asset.pub.domImage == null) {
      if (this.url != null) URL.revokeObjectURL(this.url);
      let typedArray = new Uint8Array(<any>asset.pub.image);
      let blob = new Blob([ typedArray ], { type: "image/*" });
      this.url = URL.createObjectURL(blob);

      asset.pub.domImage = new Image();
      asset.pub.domImage.src = this.url;
    }

    this.tileSetThreeTexture = new THREE.Texture(asset.pub.domImage);
    this.tileSetThreeTexture.magFilter = THREE.NearestFilter;
    this.tileSetThreeTexture.minFilter = THREE.NearestFilter;

    if (asset.pub.domImage.complete) {
      this.tileSetThreeTexture.needsUpdate = true;
      this.tileMapRenderer.setTileSet(new TileSet(asset.pub), this.tileSetThreeTexture);
      if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.tileSet();
      return;
    }

    let onImageLoaded = () => {
      asset.pub.domImage.removeEventListener("load", onImageLoaded);
      this.tileSetThreeTexture.needsUpdate = true;
      this.tileMapRenderer.setTileSet(new TileSet(asset.pub), this.tileSetThreeTexture);
      if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.tileSet();
    }

    asset.pub.domImage.addEventListener("load", onImageLoaded);
  };

  _onTileSetAssetEdited = (id: string, command: string, ...args: any[]) => {
    let commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.tileSet[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onTileSetEditCommand_upload() {
    if (this.url != null) URL.revokeObjectURL(this.url);
    let typedArray = new Uint8Array(<any>this.tileSetAsset.pub.image);
    let blob = new Blob([ typedArray ], { type: "image/*" });
    this.url = URL.createObjectURL(blob);

    let image = this.tileSetThreeTexture.image;
    image.src = this.url;
    image.addEventListener("load", () => {
      this.tileSetThreeTexture.needsUpdate = true;
      this.tileMapRenderer.setTileSet(new TileSet(this.tileSetAsset.pub), this.tileSetThreeTexture);
    });
  }

  _onTileSetEditCommand_setProperty() {
    this.tileMapRenderer.setTileSet(new TileSet(this.tileSetAsset.pub), this.tileSetThreeTexture);
  }

  _onTileSetAssetTrashed = (assetId: string) => {
    this.tileMapRenderer.setTileSet(null, null);
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
        this.tileMapRenderer.setTileSet(null, null);
        if (this.tileSetThreeTexture != null) {
          this.tileSetThreeTexture.dispose();
          this.tileSetThreeTexture = null;
        }

        if (this.tileMapAssetId != null) this.client.subAsset(this.tileMapAssetId, "tileMap", this.tileMapSubscriber);
        break;

      // case "tileSetAssetId":
    }
  }
}
