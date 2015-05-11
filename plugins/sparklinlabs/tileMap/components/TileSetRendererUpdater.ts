let THREE = SupEngine.THREE;
import TileSetAsset from "../data/TileSetAsset";
import TileSet from "./TileSet";
import TileSetRenderer from "./TileSetRenderer";

export default class TileSetRendererUpdater {

  client: SupClient.ProjectClient;
  tileSetRenderer: TileSetRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  tileSetAssetId: string;
  url: string;

  tileSetSubscriber: {
    onAssetReceived: (assetId: string, asset: TileSetAsset) => any;
    onAssetEdited: (id: string, command: string, ...args: any[]) => any;
    onAssetTrashed: (assetId: string) => any;
  };

  tileSetAsset: TileSetAsset;
  tileSetThreeTexture: THREE.Texture;

  constructor(client: SupClient.ProjectClient, tileSetRenderer: TileSetRenderer, config: any, receiveAssetCallbacks?: any, editAssetCallbacks?: any) {
    this.client = client;
    this.tileSetRenderer = tileSetRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;
    this.tileSetAssetId = config.tileSetAssetId;

    this.tileSetSubscriber = {
      onAssetReceived: this._onTileSetAssetReceived,
      onAssetEdited: this._onTileSetAssetEdited,
      onAssetTrashed: this._onTileSetAssetTrashed
    }

    if (this.tileSetAssetId != null) this.client.subAsset(this.tileSetAssetId, "tileSet", this.tileSetSubscriber);
  }

  destroy() {
    if (this.tileSetAssetId != null) {
      this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);
      this.tileSetThreeTexture.dispose();
    }
  }

  changeTileSetId(tileSetId: string) {
    if (this.tileSetAssetId != null) this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);
    this.tileSetAssetId = tileSetId;

    this.tileSetAsset = null;
    if (this.url != null) URL.revokeObjectURL(this.url);
    if (this.tileSetThreeTexture != null) this.tileSetThreeTexture.dispose();
    this.tileSetThreeTexture = null;

    if (this.tileSetAssetId != null) this.client.subAsset(this.tileSetAssetId, "tileSet", this.tileSetSubscriber);
  }

  _onTileSetAssetReceived = (assetId: string, asset: TileSetAsset) => {
    this.tileSetAsset = asset;

    if (asset.pub.domImage == null) {
      if (this.url != null) URL.revokeObjectURL(this.url);
      let typedArray = new Uint8Array(<any>asset.pub.image);
      let blob = new Blob([ typedArray ], { type: "image/*" });
      this.url = URL.createObjectURL(blob);

      asset.pub.domImage = new Image
      asset.pub.domImage.src = this.url
    }

    if (this.tileSetThreeTexture != null) this.tileSetThreeTexture.dispose();
    this.tileSetThreeTexture = new THREE.Texture(asset.pub.domImage);
    this.tileSetThreeTexture.magFilter = THREE.NearestFilter;
    this.tileSetThreeTexture.minFilter = THREE.NearestFilter;

    let setupTileSetTexture = () => {
      this.tileSetThreeTexture.needsUpdate = true;
      this.tileSetRenderer.setTileSet(new TileSet(asset.pub), this.tileSetThreeTexture);
      this.tileSetRenderer.gridRenderer.setGrid({
        width: asset.pub.domImage.width / asset.pub.gridSize,
        height: asset.pub.domImage.height / asset.pub.gridSize,
        direction: -1,
        orthographicScale: 10,
        ratio: 1
      });

      if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.tileSet();
    }

    console.log(asset.pub.domImage.complete);
    if (asset.pub.domImage.complete) { setupTileSetTexture(); return; }

    let onImageLoaded = () => {
      asset.pub.domImage.removeEventListener("load", onImageLoaded);
      setupTileSetTexture();
    }

    asset.pub.domImage.addEventListener("load", onImageLoaded);
  }

  _onTileSetAssetEdited = (id: string, command: string, ...args: any[]) => {
    let commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.tileSet[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onEditCommand_upload() {
    if (this.url != null) URL.revokeObjectURL(this.url);
    let typedArray = new Uint8Array(<any>this.tileSetAsset.pub.image);
    let blob = new Blob([ typedArray ], { type: "image/*" });
    this.url = URL.createObjectURL(blob);

    let image = this.tileSetThreeTexture.image;
    image.src = this.url;
    image.addEventListener("load", () => {
      this.tileSetThreeTexture.needsUpdate = true;
      this.tileSetRenderer.setTileSet(new TileSet(this.tileSetAsset.pub), this.tileSetThreeTexture);

      let width = this.tileSetThreeTexture.image.width / this.tileSetAsset.pub.gridSize;
      let height = this.tileSetThreeTexture.image.height / this.tileSetAsset.pub.gridSize;
      this.tileSetRenderer.gridRenderer.resize(width, height);
    });
  }

  _onEditCommand_setProperty(key: string, value: any) {
    switch (key) {
      case "gridSize":
        this.tileSetRenderer.refreshScaleRatio();

        let width = this.tileSetThreeTexture.image.width / this.tileSetAsset.pub.gridSize;
        let height = this.tileSetThreeTexture.image.height / this.tileSetAsset.pub.gridSize;
        this.tileSetRenderer.gridRenderer.resize(width, height);
        break;
    }
  }

  _onTileSetAssetTrashed = (assetId: string) => {
    this.tileSetRenderer.setTileSet(null, null);
    if (this.editAssetCallbacks != null) {
      // FIXME: We should probably have a this.trashAssetCallback instead
      // and let editors handle things how they want
      SupClient.onAssetTrashed();
    }
  }
}
