import TileSetAsset from "../data/TileSetAsset";
import TileSet from "./TileSet";
import TileSetRenderer from "./TileSetRenderer";

interface TileSetRendererConfigPub {
  tileSetAssetId: string;
}

export default class TileSetRendererUpdater {
  tileSetAssetId: string;
  tileSetSubscriber: SupClient.AssetSubscriber;
  tileSetAsset: TileSetAsset;

  constructor(private client: SupClient.ProjectClient, public tileSetRenderer: TileSetRenderer, config: TileSetRendererConfigPub,
  private externalSubscriber?: SupClient.AssetSubscriber) {
    this.client = client;
    this.tileSetRenderer = tileSetRenderer;
    this.tileSetAssetId = config.tileSetAssetId;

    if (this.externalSubscriber == null) this.externalSubscriber = {};

    this.tileSetSubscriber = {
      onAssetReceived: this.onTileSetAssetReceived,
      onAssetEdited: this.onTileSetAssetEdited,
      onAssetTrashed: this.onTileSetAssetTrashed
    };
    if (this.tileSetAssetId != null) this.client.subAsset(this.tileSetAssetId, "tileSet", this.tileSetSubscriber);
  }

  destroy() {
    if (this.tileSetAssetId != null) { this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber); }
  }

  changeTileSetId(tileSetId: string) {
    if (this.tileSetAssetId != null) this.client.unsubAsset(this.tileSetAssetId, this.tileSetSubscriber);
    this.tileSetAssetId = tileSetId;

    this.tileSetAsset = null;
    this.tileSetRenderer.setTileSet(null);
    this.tileSetRenderer.gridRenderer.resize(1, 1);

    if (this.tileSetAssetId != null) this.client.subAsset(this.tileSetAssetId, "tileSet", this.tileSetSubscriber);
  }

  private onTileSetAssetReceived = (assetId: string, asset: TileSetAsset) => {
    this.prepareTexture(asset.pub.texture, () => {
      this.tileSetAsset = asset;

      if (asset.pub.texture != null) {
        this.tileSetRenderer.setTileSet(new TileSet(asset.pub));
        this.tileSetRenderer.gridRenderer.setGrid({
          width: asset.pub.texture.image.width / asset.pub.grid.width,
          height: asset.pub.texture.image.height / asset.pub.grid.height,
          direction: -1,
          orthographicScale: 10,
          ratio: { x: 1, y: asset.pub.grid.width / asset.pub.grid.height }
        });
      }

      if (this.externalSubscriber.onAssetReceived != null) this.externalSubscriber.onAssetReceived(assetId, asset);
    });
  }

  private prepareTexture(texture: THREE.Texture, callback: Function) {
    if (texture == null) {
      callback();
      return;
    }

    if (texture.image.complete) callback();
    else texture.image.addEventListener("load", callback);
  }

  private onTileSetAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    let callEditCallback = true;
    const commandFunction = this.onEditCommands[command];
    if (commandFunction != null && commandFunction(...args) === false) callEditCallback = false;

    if (callEditCallback && this.externalSubscriber.onAssetEdited != null) {
      this.externalSubscriber.onAssetEdited(assetId, command, ...args);
    }
  }

  private onEditCommands: { [command: string]: Function; } = {
    upload: () => {
      const texture = this.tileSetAsset.pub.texture;
      this.prepareTexture(texture, () => {
        this.tileSetRenderer.setTileSet(new TileSet(this.tileSetAsset.pub));

        const width = texture.image.width / this.tileSetAsset.pub.grid.width;
        const height = texture.image.height / this.tileSetAsset.pub.grid.height;
        this.tileSetRenderer.gridRenderer.resize(width, height);
        this.tileSetRenderer.gridRenderer.setRatio({ x: 1, y: this.tileSetAsset.pub.grid.width / this.tileSetAsset.pub.grid.height });

        if (this.externalSubscriber.onAssetEdited != null) {
          this.externalSubscriber.onAssetEdited(this.tileSetAsset.id, "upload");
        }
      });

      return false;
    },

    setProperty: (key: string, value: any) => {
      switch (key) {
        case "grid.width":
        case "grid.height":
          this.tileSetRenderer.refreshScaleRatio();

          const width = this.tileSetAsset.pub.texture.image.width / this.tileSetAsset.pub.grid.width;
          const height = this.tileSetAsset.pub.texture.image.height / this.tileSetAsset.pub.grid.height;
          this.tileSetRenderer.gridRenderer.resize(width, height);
          this.tileSetRenderer.gridRenderer.setRatio({ x: 1, y: this.tileSetAsset.pub.grid.width / this.tileSetAsset.pub.grid.height });
          break;
      }
    }
  };

  private onTileSetAssetTrashed = (assetId: string) => {
    this.tileSetRenderer.setTileSet(null);

    if (this.externalSubscriber.onAssetTrashed != null) this.externalSubscriber.onAssetTrashed(assetId);
  }
}
