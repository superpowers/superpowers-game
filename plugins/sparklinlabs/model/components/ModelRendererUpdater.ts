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
  overrideOpacity = false;
  modelAsset: ModelAsset = null;
  materialType: string;
  shaderAssetId: string;
  shaderPub: any;

  mapObjectURLs: { [mapName: string]: string } = {};

  modelSubscriber = {
    onAssetReceived: this._onModelAssetReceived.bind(this),
    onAssetEdited: this._onModelAssetEdited.bind(this),
    onAssetTrashed: this._onModelAssetTrashed.bind(this)
  };

  shaderSubscriber = {
    onAssetReceived: this._onShaderAssetReceived.bind(this),
    onAssetEdited: this._onShaderAssetEdited.bind(this),
    onAssetTrashed: this._onShaderAssetTrashed.bind(this)
  };

  constructor(client: SupClient.ProjectClient, modelRenderer: ModelRenderer, config: any, receiveAssetCallbacks: any, editAssetCallbacks: any) {
    this.client = client;
    this.modelRenderer = modelRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.modelAssetId = config.modelAssetId;
    this.animationId = config.animationId;
    this.materialType = config.materialType;
    this.shaderAssetId = config.shaderAssetId;
    if (config.overrideOpacity != null) this.overrideOpacity = config.overrideOpacity;

    this.modelRenderer.castShadow = config.castShadow;
    this.modelRenderer.receiveShadow = config.receiveShadow;
    if (config.overrideOpacity) this.modelRenderer.opacity = config.opacity;
    if (config.color != null) {
      let hex = parseInt(config.color, 16);
      this.modelRenderer.color.r = (hex >> 16 & 255) / 255;
      this.modelRenderer.color.g = (hex >> 8 & 255) / 255;
      this.modelRenderer.color.b = (hex & 255) / 255;
    }

    if (this.modelAssetId != null) this.client.subAsset(this.modelAssetId, "model", this.modelSubscriber);
    if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
  }

  destroy() {
    if (this.modelAssetId != null) this.client.unsubAsset(this.modelAssetId, this.modelSubscriber);
    if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
  }

  _onModelAssetReceived(assetId: string, asset: ModelAsset) {
    if (this.modelRenderer.opacity == null) this.modelRenderer.opacity = asset.pub.opacity;
    this.modelAsset = asset;
    this._prepareMaps(() => {
      this._setModel();
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
      let buffer: any = this.modelAsset.pub.maps[key];
      if (buffer == null || buffer.byteLength === 0) { cb(); return; }

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
      } else cb();

    }, callback);
  }

  _setModel() {
    if (this.modelAsset == null || (this.materialType === "shader" && this.shaderPub == null)) {
      this.modelRenderer.setModel(null);
      return;
    }

    this.modelRenderer.setModel(this.modelAsset.pub, this.materialType, this.shaderPub);
    if (this.animationId != null) this._playAnimation();
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

  _onEditCommand_setModel() {
    this._setModel();
  }

  _onEditCommand_setMaps(maps: any) {
    // TODO: Only update the maps that changed, don't recreate the whole model
    this._prepareMaps(() => {
      this._setModel();
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

  _onEditCommand_setMapSlot(slot: string, name: string) {
    if (slot === "map") this._setModel();
  }

  _onEditCommand_deleteMap(name: string) { this._setModel(); }

  _onEditCommand_setProperty(path: string, value: any) {
    switch(path) {
      case "opacity":
        if (! this.overrideOpacity) this.modelRenderer.setOpacity(value);
        break;
    }
  }

  _onModelAssetTrashed() {
    this.modelAsset = null;
    this.modelRenderer.setModel(null);
    // FIXME: the updater shouldn't be dealing with SupClient.onAssetTrashed directly
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }

  _onShaderAssetReceived(assetId: string, asset: { pub: any} ) {
    this.shaderPub = asset.pub;
    this._setModel();
  }

  _onShaderAssetEdited(id: string, command: string, ...args: any[]) {
    if (command !== "editVertexShader" && command !== "editFragmentShader") this._setModel();
  }

  _onShaderAssetTrashed() {
    this.shaderPub = null;
    this._setModel();
  }

  config_setProperty(path: string, value: any) {
    switch(path) {
      case "modelAssetId":
        if (this.modelAssetId != null) this.client.unsubAsset(this.modelAssetId, this.modelSubscriber);
        this.modelAssetId = value;

        this.modelAsset = null;
        this.modelRenderer.setModel(null, null);

        if (this.modelAssetId != null) this.client.subAsset(this.modelAssetId, "model", this.modelSubscriber);
        break;

      case "animationId":
        this.animationId = value;
        this._setModel();
        break;

      case "castShadow":
        this.modelRenderer.setCastShadow(value);
        break;

      case "receiveShadow":
        this.modelRenderer.threeMesh.receiveShadow = value;
        this.modelRenderer.threeMesh.material.needsUpdate = true;
        break;

      case "overrideOpacity":
        this.overrideOpacity = value;
        this.modelRenderer.setOpacity(value ? null : this.modelAsset.pub.opacity);
        break;

      case "opacity":
        this.modelRenderer.setOpacity(value);
        break;

      case "color":
        let hex = parseInt(value, 16);
        this.modelRenderer.color.r = (hex >> 16 & 255) / 255;
        this.modelRenderer.color.g = (hex >> 8 & 255) / 255;
        this.modelRenderer.color.b = (hex & 255) / 255;
        let material = <THREE.MeshBasicMaterial>this.modelRenderer.threeMesh.material;
        material.color.setRGB(this.modelRenderer.color.r, this.modelRenderer.color.g, this.modelRenderer.color.b);
        material.needsUpdate = true;
        break;

      case "materialType":
        this.materialType = value;
        this._setModel();
        break;

      case "shaderAssetId":
        if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
        this.shaderAssetId = value;

        this.shaderPub = null;
        this.modelRenderer.setModel(null);

        if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
        break;
    }
  }
}
