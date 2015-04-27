import * as async from "async";
import ModelAsset from "../data/ModelAsset";
import ModelRenderer from "./ModelRenderer";
let THREE = SupEngine.THREE;

export default class ModelRendererUpdater {

  client: SupClient.ProjectClient;
  modelRenderer: ModelRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  modelAssetId: string;
  animationId: string;
  modelAsset: ModelAsset = null;

  mapObjectURLs: { [mapName: string]: string } = {};

  modelSubscriber = {
    onAssetReceived: this._onModelAssetReceived.bind(this),
    onAssetEdited: this._onModelAssetEdited.bind(this),
    onAssetTrashed: this._onModelAssetTrashed.bind(this)
  };

  constructor(client: SupClient.ProjectClient, modelRenderer: ModelRenderer, config: any, receiveAssetCallbacks: any, editAssetCallbacks: any) {
    this.client = client;
    this.modelRenderer = modelRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.modelAssetId = config.modelAssetId;
    this.animationId = config.animationId;

    if (this.modelAssetId != null) {
      this.client.subAsset(this.modelAssetId, "model", this.modelSubscriber);
    }
  }

  _onModelAssetReceived(assetId: string, asset: ModelAsset) {
    this.modelAsset = asset;
    this._prepareMaps(() => {
      this.modelRenderer.setModel(this.modelAsset.pub);
      if (this.animationId != null) this._playAnimation();

      if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.model();
    });
  }

  _prepareMaps(callback: () => any) {
    this.modelAsset.pub.textures = {};

    for (let key in this.mapObjectURLs) {
      URL.revokeObjectURL(this.mapObjectURLs[key]);
      delete this.mapObjectURLs[key];
    }

    async.each(Object.keys(this.modelAsset.pub.maps), (key, cb) => {
      let buffer = this.modelAsset.pub.maps[key];
      if (buffer == null) { cb(); return; }

      let texture = this.modelAsset.pub.textures[key];
      let image: HTMLImageElement = (texture != null) ? texture.image : null;

      if (image == null) {
        image = new Image;
        texture = this.modelAsset.pub.textures[key] = new THREE.Texture(image);

        texture.magFilter = SupEngine.THREE.NearestFilter;
        texture.minFilter = SupEngine.THREE.NearestFilter;

        let typedArray = new Uint8Array(buffer);
        let blob = new Blob([ typedArray ], { type: "image/*" });
        image.src = this.mapObjectURLs[key] = URL.createObjectURL(blob);
      }

      if (!image.complete) {
        image.addEventListener("load", () => { texture.needsUpdate = true; cb(); return });
      } else {
        cb();
      }

    }, callback);
  }

  _playAnimation() {
    let animation = this.modelAsset.animations.byId[this.animationId];
    if (animation == null) return;

    this.modelRenderer.setAnimation(animation.name);
  }

  _onModelAssetEdited(id: string, command: string, ...args: any[]) {
    let commandCallback = (<any>this)[`_onEditCommand_${command}`];
    if (commandCallback != null) commandCallback.apply(this, args);

    if (this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.model[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onEditCommand_setAttributes() {
    this.modelRenderer.setModel(this.modelAsset.pub);
    if (this.animationId != null) this._playAnimation();
  }

  _onEditCommand_setMaps(maps: any) {
    // TODO: Only update the maps that changed, don"t recreate the whole model
    this._prepareMaps(() => {
      this.modelRenderer.setModel(this.modelAsset.pub);
      if (this.animationId != null) this._playAnimation();
    });
  }

  _onEditCommand_newAnimation(animation: any, index: number) {
    this.modelRenderer.updateAnimationsByName();
    this._playAnimation();
  }

  _onEditCommand_deleteAnimation(id: string) {
    this.modelRenderer.updateAnimationsByName();
    this._playAnimation();
  }

  _onEditCommand_setAnimationProperty(id: string, key: string, value: any) {
    this.modelRenderer.updateAnimationsByName();
    this._playAnimation();
  }

  _onModelAssetTrashed() {
    this.modelRenderer.setModel(null);
    // FIXME: the updater shouldn't be dealing with SupClient.onAssetTrashed directly
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }

  config_setProperty(path: string, value: any) {
    switch(path) {
      case "modelAssetId": {
        if (this.modelAssetId != null) this.client.unsubAsset(this.modelAssetId, this.modelSubscriber);
        this.modelAssetId = value;

        this.modelAsset = null;
        this.modelRenderer.setModel(null);

        if (this.modelAssetId != null) this.client.subAsset(this.modelAssetId, "model", this.modelSubscriber);
        break;
      }

      case "animationId": {
        this.animationId = value;

        if (this.modelAsset != null) {
          if (this.animationId != null) this._playAnimation();
          else this.modelRenderer.setAnimation(null);
        }
        break;
      }
    }
  }
}
