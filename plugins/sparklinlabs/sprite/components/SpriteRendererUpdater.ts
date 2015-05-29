let THREE = SupEngine.THREE;
import SpriteAsset from "../data/SpriteAsset";
import SpriteRenderer from "./SpriteRenderer";

export default class SpriteRendererUpdater {

  client: SupClient.ProjectClient;
  spriteRenderer: SpriteRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  spriteAssetId: string;
  animationId: string;
  materialType: string;
  overrideOpacity = false;
  spriteAsset: SpriteAsset;
  url: string;

  spriteSubscriber = {
    onAssetReceived: this._onSpriteAssetReceived.bind(this),
    onAssetEdited: this._onSpriteAssetEdited.bind(this),
    onAssetTrashed: this._onSpriteAssetTrashed.bind(this)
  };

  constructor(client: SupClient.ProjectClient, spriteRenderer: SpriteRenderer, config: any, receiveAssetCallbacks: any, editAssetCallbacks: any) {
    this.client = client;
    this.spriteRenderer = spriteRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.spriteAssetId = config.spriteAssetId;
    this.animationId = config.animationId;
    this.materialType = config.materialType;
    if (config.overrideOpacity != null) this.overrideOpacity = config.overrideOpacity;
    this.spriteAsset = null;

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
  }

  destroy() {
    if (this.spriteAssetId != null) this.client.unsubAsset(this.spriteAssetId, this.spriteSubscriber);
  }

  _onSpriteAssetReceived(assetId: string, asset: SpriteAsset) {
    this.spriteAsset = asset;
    if (this.spriteRenderer.opacity == null) this.spriteRenderer.opacity = asset.pub.opacity;

    let image = (asset.pub.texture != null) ? asset.pub.texture.image : null;
    if (image == null) {
      image = new Image();

      asset.pub.texture = new THREE.Texture(image);
      if (asset.pub.filtering === "pixelated") {
        asset.pub.texture.magFilter = THREE.NearestFilter;
        asset.pub.texture.minFilter = THREE.NearestFilter;
      }

      if (this.url != null) URL.revokeObjectURL(this.url);

      let typedArray = new Uint8Array((<any>asset.pub.image));
      let blob = new Blob([ typedArray ], { type: "image/*" });
      this.url = URL.createObjectURL(blob);
      image.src = this.url
    }

    if (! image.complete) {
      if ((<any>asset.pub.image).byteLength === 0) {
        if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.sprite();
      }
      else {
        let onImageLoaded = () => {
          image.removeEventListener("load", onImageLoaded);
          asset.pub.texture.needsUpdate = true;
          this.spriteRenderer.setSprite(asset.pub, this.materialType);
          if (this.animationId != null) this._playAnimation();

          if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.sprite();
        };

        image.addEventListener("load", onImageLoaded);
      }
    }
    else {
      this.spriteRenderer.setSprite(asset.pub, this.materialType);
      if (this.animationId != null) this._playAnimation();

      if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.sprite();
    }
  }

  _playAnimation() {
    let animation = this.spriteAsset.animations.byId[this.animationId];
    if (animation == null) return;

    this.spriteRenderer.setAnimation(animation.name);
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

  _onEditCommand_upload() {
    if (this.url != null) URL.revokeObjectURL(this.url);

    let typedArray = new Uint8Array((<any>this.spriteAsset.pub.image));
    let blob = new Blob([ typedArray ], { type: "image/*" });
    this.url = URL.createObjectURL(blob);
    let image = this.spriteAsset.pub.texture.image;
    image.src = this.url;
    image.addEventListener("load", () => {
      this.spriteAsset.pub.texture.needsUpdate = true;
      this.spriteRenderer.setSprite(this.spriteAsset.pub, this.materialType);

      if (this.editAssetCallbacks != null) this.editAssetCallbacks.sprite.upload();
    });
    return false
  }

  _onEditCommand_setProperty(path: string, value: any) {
    switch(path) {
      case "filtering":
        if (this.spriteAsset.pub.filtering === "pixelated") {
          this.spriteAsset.pub.texture.magFilter = THREE.NearestFilter;
          this.spriteAsset.pub.texture.minFilter = THREE.NearestFilter;
        } else {
          this.spriteAsset.pub.texture.magFilter = THREE.LinearFilter;
          this.spriteAsset.pub.texture.minFilter = THREE.LinearMipMapLinearFilter;
        }
        this.spriteAsset.pub.texture.needsUpdate = true;
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

      default:
        this.spriteRenderer.setSprite(this.spriteAsset.pub, this.materialType);
        if (this.animationId != null) this._playAnimation();
        break;
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
    this.spriteRenderer.setSprite(null, null);
    // FIXME: the updater shouldn't be dealing with SupClient.onAssetTrashed directly
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "spriteAssetId":
        if (this.spriteAssetId != null) this.client.unsubAsset(this.spriteAssetId, this.spriteSubscriber);
        this.spriteAssetId = value;

        this.spriteAsset = null;
        this.spriteRenderer.setSprite(null, null);

        if (this.spriteAssetId != null) this.client.subAsset(this.spriteAssetId, "sprite", this.spriteSubscriber);
        break;

      case "animationId":
        this.animationId = value;

        if (this.spriteAsset != null) {
          if (this.animationId != null) this._playAnimation();
          else this.spriteRenderer.setAnimation(null);
        }
        break;

      case "castShadow":
        this.spriteRenderer.setCastShadow(value);
        break;

      case "receiveShadow":
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
        if (this.spriteAsset != null) this.spriteRenderer.setSprite(this.spriteAsset.pub, this.materialType);
        if (this.animationId != null) this._playAnimation();
        break;
    }
  }
}
