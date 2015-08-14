import * as async from "async";
import CubicModelAsset from "../data/CubicModelAsset";
import CubicModelRenderer from "./CubicModelRenderer";
let THREE = SupEngine.THREE;

export default class CubicModelRendererUpdater {

  client: SupClient.ProjectClient;
  cubicModelRenderer: CubicModelRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  cubicModelAssetId: string;
  cubicModelAsset: CubicModelAsset = null;

  cubicModelSubscriber = {
    onAssetReceived: this._onCubicModelAssetReceived.bind(this),
    onAssetEdited: this._onCubicModelAssetEdited.bind(this),
    onAssetTrashed: this._onCubicModelAssetTrashed.bind(this)
  };

  constructor(client: SupClient.ProjectClient, cubicModelRenderer: CubicModelRenderer, config: any, receiveAssetCallbacks: any, editAssetCallbacks: any) {
    this.client = client;
    this.cubicModelRenderer = cubicModelRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.cubicModelAssetId = config.cubicModelAssetId;

    if (this.cubicModelAssetId != null) this.client.subAsset(this.cubicModelAssetId, "cubicModel", this.cubicModelSubscriber);
  }

  destroy() {
    if (this.cubicModelAssetId != null) this.client.unsubAsset(this.cubicModelAssetId, this.cubicModelSubscriber);
  }
  
  _onCubicModelAssetReceived(assetId: string, asset: CubicModelAsset) {
    this.cubicModelAsset = asset;
    this._setCubicModel();
    if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.cubicModel();
  }
  
  _setCubicModel() {
    if (this.cubicModelAsset == null) {
      this.cubicModelRenderer.setModel(null);
      return;
    }
    
    this.cubicModelRenderer.setModel(this.cubicModelAsset.pub);
  }
  
  _onCubicModelAssetEdited(id: string, command: string, ...args: any[]) {
    let commandCallback = (<any>this)[`_onEditCommand_${command}`];
    if (commandCallback != null) commandCallback.apply(this, args);

    if (this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.model[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onCubicModelAssetTrashed() {
    this.cubicModelAsset = null;
    this.cubicModelRenderer.setModel(null);
    // FIXME: the updater shouldn't be dealing with SupClient.onAssetTrashed directly
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }

  config_setProperty(path: string, value: any) {
    switch(path) {
      case "cubicModelAssetId":
        if (this.cubicModelAssetId != null) this.client.unsubAsset(this.cubicModelAssetId, this.cubicModelSubscriber);
        this.cubicModelAssetId = value;

        this.cubicModelAsset = null;
        this.cubicModelRenderer.setModel(null, null);

        if (this.cubicModelAssetId != null) this.client.subAsset(this.cubicModelAssetId, "cubicModel", this.cubicModelSubscriber);
        break;
    }
  }
}
