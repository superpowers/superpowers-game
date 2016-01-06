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
  opacity: number;

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
    this.opacity = config.opacity;
    this.spriteAsset = null;

    this.spriteRenderer.horizontalFlip = config.horizontalFlip;
    this.spriteRenderer.verticalFlip = config.verticalFlip;
    this.spriteRenderer.castShadow = config.castShadow;
    this.spriteRenderer.receiveShadow = config.receiveShadow;
    if (config.overrideOpacity) this.spriteRenderer.setOpacity(config.opacity);
    if (config.color != null) {
      let hex = parseInt(config.color, 16);
      let r = (hex >> 16 & 255) / 255;
      let g = (hex >> 8 & 255) / 255;
      let b = (hex & 255) / 255;
      this.spriteRenderer.setColor(r, g, b);
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
    this._prepareMaps(asset.pub.textures, () => {
      this.spriteAsset = asset;
      this._setSprite();
      if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.sprite();
    });
  }

  _prepareMaps(textures: { [name: string]: THREE.Texture }, callback: () => any) {
    let textureNames = Object.keys(textures);
    let texturesToLoad = textureNames.length;

    if (texturesToLoad === 0) {
      callback();
      return;
    }

    function onTextureLoaded() {
      texturesToLoad--;
      if (texturesToLoad === 0) callback();
    }

    textureNames.forEach((key) => {
      let image = textures[key].image;
      if (!image.complete) image.addEventListener("load", onTextureLoaded);
      else onTextureLoaded();
    });
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
    this._prepareMaps(this.spriteAsset.pub.textures, () => {
      this._setSprite();
      let editCallback = (this.editAssetCallbacks != null) ? this.editAssetCallbacks.sprite["setMaps"] : null;
      if (editCallback != null) editCallback();
    });
    return false;
  }

  _onEditCommand_setMapSlot(slot: string, name: string) { this._setSprite(); }

  _onEditCommand_deleteMap(name: string) { this._setSprite(); }

  _onEditCommand_setProperty(path: string, value: any) {
    switch(path) {
      case "filtering":
        break;

      case "opacity":
        if (!this.overrideOpacity) this.spriteRenderer.setOpacity(value);
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
        let r = (hex >> 16 & 255) / 255;
        let g = (hex >> 8 & 255) / 255;
        let b = (hex & 255) / 255;
        this.spriteRenderer.setColor(r, g, b);
        break;

      case "overrideOpacity":
        this.overrideOpacity = value;
        this.spriteRenderer.setOpacity(value ? this.opacity : (this.spriteAsset != null ? this.spriteAsset.pub.opacity : null));
        break;

      case "opacity":
        this.opacity = value;
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
