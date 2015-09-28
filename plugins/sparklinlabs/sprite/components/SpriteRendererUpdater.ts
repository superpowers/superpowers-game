import * as async from "async";
let THREE = SupEngine.THREE;
import SpriteAsset from "../data/SpriteAsset";
import SpriteRenderer from "./SpriteRenderer";

export default class SpriteRendererUpdater {

  client: SupClient.ProjectClient;
  spriteRenderer: SpriteRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  spriteAssetId: string;
  spriteAsset: SpriteAsset;
  animationId: string;
  looping = true;
  materialType: string;
  shaderAssetId: string;
  shaderPub: any;
  overrideOpacity = false;
  mapObjectURLs: { [mapName: string]: string } = {};

  spriteSubscriber = {
    onAssetReceived: this._onSpriteAssetReceived.bind(this),
    onAssetEdited: this._onSpriteAssetEdited.bind(this),
    onAssetTrashed: this._onSpriteAssetTrashed.bind(this)
  };

  shaderSubscriber = {
    onAssetReceived: this._onShaderAssetReceived.bind(this),
    onAssetEdited: this._onShaderAssetEdited.bind(this),
    onAssetTrashed: this._onShaderAssetTrashed.bind(this)
  };

  constructor(client: SupClient.ProjectClient, spriteRenderer: SpriteRenderer, config: any, receiveAssetCallbacks: any, editAssetCallbacks: any) {
    this.client = client;
    this.spriteRenderer = spriteRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.spriteAssetId = config.spriteAssetId;
    this.animationId = config.animationId;
    this.materialType = config.materialType;
    this.shaderAssetId = config.shaderAssetId;
    if (config.overrideOpacity != null) this.overrideOpacity = config.overrideOpacity;
    this.spriteAsset = null;

    this.spriteRenderer.horizontalFlip = config.horizontalFlip;
    this.spriteRenderer.verticalFlip = config.verticalFlip;
    this.spriteRenderer.castShadow = config.castShadow;
    this.spriteRenderer.receiveShadow = config.receiveShadow;
    if (config.overrideOpacity) this.spriteRenderer.opacity = config.opacity;
    if (config.color != null) {
      let hex = parseInt(config.color, 16);
      this.spriteRenderer.color.r = (hex >> 16 & 255) / 255;
      this.spriteRenderer.color.g = (hex >> 8 & 255) / 255;
      this.spriteRenderer.color.b = (hex & 255) / 255;
    }

    if (this.spriteAssetId != null) this.client.subAsset(this.spriteAssetId, "sprite", this.spriteSubscriber);
    if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
  }

  destroy() {
    if (this.spriteAssetId != null) this.client.unsubAsset(this.spriteAssetId, this.spriteSubscriber);
    if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
  }

  _onSpriteAssetReceived(assetId: string, asset: SpriteAsset) {
    if (this.spriteRenderer.opacity == null) this.spriteRenderer.opacity = asset.pub.opacity;
    this.spriteAsset = asset;
    this._prepareMaps(() => {
      this._setSprite();
      if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.sprite();
    });
  }

  _prepareMaps(callback: () => any) {
    this.spriteAsset.pub.textures = {};

    for (let key in this.mapObjectURLs) {
      URL.revokeObjectURL(this.mapObjectURLs[key]);
      delete this.mapObjectURLs[key];
    }

    async.each(Object.keys(this.spriteAsset.pub.maps), (key, cb) => {
      let buffer: any = this.spriteAsset.pub.maps[key];
      if (buffer == null || buffer.byteLength === 0) { cb(); return; }

      let texture = this.spriteAsset.pub.textures[key];
      let image: HTMLImageElement = (texture != null) ? texture.image : null;

      if (image == null) {
        image = new Image;
        texture = this.spriteAsset.pub.textures[key] = new THREE.Texture(image);

        if (this.spriteAsset.pub.filtering === "pixelated") {
          texture.magFilter = SupEngine.THREE.NearestFilter;
          texture.minFilter = SupEngine.THREE.NearestFilter;
        }

        let typedArray = new Uint8Array(buffer);
        let blob = new Blob([ typedArray ], { type: "image/*" });
        image.src = this.mapObjectURLs[key] = URL.createObjectURL(blob);
      }

      if (!image.complete) {
        image.addEventListener("load", () => { texture.needsUpdate = true; cb(); return });
      } else cb();

    }, callback);
  }

  _setSprite() {
    if (this.spriteAsset == null || (this.materialType === "shader" && this.shaderPub == null)) {
      this.spriteRenderer.setSprite(null);
      return;
    }

    this.spriteRenderer.setSprite(this.spriteAsset.pub, this.materialType, this.shaderPub);
    if (this.animationId != null) this._playAnimation();
  }

  _playAnimation() {
    let animation = this.spriteAsset.animations.byId[this.animationId];
    if (animation == null) return;

    this.spriteRenderer.setAnimation(animation.name, this.looping);
  }

  _onSpriteAssetEdited(id: string, command: string, ...args: any[]) {
    let callEditCallback = true;
    let commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) {
      if (commandFunction.apply(this, args) === false) callEditCallback = false;
    }

    if (callEditCallback && this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.sprite[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _onEditCommand_setMaps(maps: any) {
    // TODO: Only update the maps that changed, don't recreate the whole model
    this._prepareMaps(() => {
      this._setSprite();
      let editCallback = this.editAssetCallbacks.sprite["setMaps"];
      if (editCallback != null) editCallback();
    });
    return false;
  }

  _onEditCommand_setMapSlot(slot: string, name: string) { this._setSprite(); }

  _onEditCommand_deleteMap(name: string) { this._setSprite(); }

  _onEditCommand_setProperty(path: string, value: any) {
    switch(path) {
      case "filtering":
        for (let textureName in this.spriteAsset.pub.textures) {
          let texture = this.spriteAsset.pub.textures[textureName];
          if (this.spriteAsset.pub.filtering === "pixelated") {
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;
          } else {
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearMipMapLinearFilter;
          }
          texture.needsUpdate = true;
        }
        break;

      case "opacity":
        if (! this.overrideOpacity) this.spriteRenderer.setOpacity(value);
        break;

      case "alphaTest":
        this.spriteRenderer.material.alphaTest = value;
        this.spriteRenderer.material.needsUpdate = true;
        break;

      case "pixelsPerUnit":
      case "origin.x":
      case "origin.y":
        this.spriteRenderer.updateShape();
        break;

      default: this._setSprite(); break;
    }
  }

  _onEditCommand_newAnimation() {
    this.spriteRenderer.updateAnimationsByName();
    this._playAnimation();
  }

  _onEditCommand_deleteAnimation() {
    this.spriteRenderer.updateAnimationsByName();
    this._playAnimation();
  }

  _onEditCommand_setAnimationProperty() {
    this.spriteRenderer.updateAnimationsByName();
    this._playAnimation();
  }

  _onSpriteAssetTrashed() {
    this.spriteAsset = null;
    this.spriteRenderer.setSprite(null);
    // FIXME: the updater shouldn't be dealing with SupClient.onAssetTrashed directly
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }

  _onShaderAssetReceived(assetId: string, asset: { pub: any} ) {
    this.shaderPub = asset.pub;
    this._setSprite();
  }

  _onShaderAssetEdited(id: string, command: string, ...args: any[]) {
    if (command !== "editVertexShader" && command !== "editFragmentShader") this._setSprite();
  }

  _onShaderAssetTrashed() {
    this.shaderPub = null;
    this._setSprite();
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "spriteAssetId":
        if (this.spriteAssetId != null) this.client.unsubAsset(this.spriteAssetId, this.spriteSubscriber);
        this.spriteAssetId = value;

        this.spriteAsset = null;
        this.spriteRenderer.setSprite(null);

        if (this.spriteAssetId != null) this.client.subAsset(this.spriteAssetId, "sprite", this.spriteSubscriber);
        break;

      case "animationId":
        this.animationId = value;
        this._setSprite();
        break;

      case "looping":
        this.looping = value;
        if (this.animationId != null) this._playAnimation();
        break;

      case "horizontalFlip":
        this.spriteRenderer.setHorizontalFlip(value);
        break;

      case "verticalFlip":
        this.spriteRenderer.setVerticalFlip(value);
        break;

      case "castShadow":
        this.spriteRenderer.setCastShadow(value);
        break;

      case "receiveShadow":
        this.spriteRenderer.receiveShadow = value;
        this.spriteRenderer.threeMesh.receiveShadow = value;
        this.spriteRenderer.threeMesh.material.needsUpdate = true;
        break;

      case "color":
        let hex = parseInt(value, 16);
        this.spriteRenderer.color.r = (hex >> 16 & 255) / 255;
        this.spriteRenderer.color.g = (hex >> 8 & 255) / 255;
        this.spriteRenderer.color.b = (hex & 255) / 255;
        let material = <THREE.MeshBasicMaterial>this.spriteRenderer.threeMesh.material;
        material.color.setRGB(this.spriteRenderer.color.r, this.spriteRenderer.color.g, this.spriteRenderer.color.b);
        material.needsUpdate = true;
        break;

      case "overrideOpacity":
        this.overrideOpacity = value;
        this.spriteRenderer.setOpacity(value ? null : this.spriteAsset.pub.opacity);
        break;

      case "opacity":
        this.spriteRenderer.setOpacity(value);
        break;

      case "materialType":
        this.materialType = value;
        this._setSprite();
        break;

      case "shaderAssetId":
        if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
        this.shaderAssetId = value;

        this.shaderPub = null;
        this.spriteRenderer.setSprite(null);

        if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
        break;
    }
  }
}
