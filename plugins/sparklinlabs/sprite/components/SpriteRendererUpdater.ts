var THREE = SupEngine.THREE;
import SpriteAsset = require("../data/SpriteAsset");
import SpriteRenderer = require("./SpriteRenderer");

class SpriteRendererUpdater {

  client: SupClient.ProjectClient;
  spriteRenderer: SpriteRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  spriteAssetId: string;
  animationId: string;
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

    this.spriteAssetId = config.spriteAssetId
    this.animationId = config.animationId
    this.spriteAsset = null

    if (this.spriteAssetId != null) this.client.subAsset(this.spriteAssetId, "sprite", this.spriteSubscriber);
  }

  _onSpriteAssetReceived(assetId: string, asset: any) {
    this.spriteAsset = asset;

    var image = (asset.pub.texture != null) ? asset.pub.texture.image : null;
    if (image == null) {
      image = new Image();

      asset.pub.texture = new THREE.Texture(image);
      if (asset.pub.filtering === "pixelated")
        asset.pub.texture.magFilter = THREE.NearestFilter
        asset.pub.texture.minFilter = THREE.NearestFilter

      if (this.url != null) URL.revokeObjectURL(this.url);

      var typedArray = new Uint8Array(asset.pub.image);
      var blob = new Blob([ typedArray ], { type: "image/*" });
      this.url = URL.createObjectURL(blob);
      image.src = this.url
    }
    if (! image.complete) {
      var onImageLoaded = () => {
        image.removeEventListener("load", onImageLoaded);
        asset.pub.texture.needsUpdate = true
        this.spriteRenderer.setSprite(asset.pub);
        if (this.animationId != null) this._playAnimation()

        if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.sprite( this.url );
      };

      image.addEventListener("load", onImageLoaded);
    }
    else {
      this.spriteRenderer.setSprite(asset.pub);
      if (this.animationId != null) this._playAnimation();

      if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.sprite( this.url );
    }
  }

  _playAnimation() {
    var animation = this.spriteAsset.animations.byId[this.animationId];
    if (animation == null) return;

    this.spriteRenderer.setAnimation(animation.name);
  }

  _onSpriteAssetEdited(id: string, command: string, ...args: any[]) {
    var callEditCallback = true;
    var commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) {
      if (commandFunction.apply(this, args) === false) callEditCallback = false;
    }

    if (callEditCallback && this.editAssetCallbacks != null) this.editAssetCallbacks.sprite[command].apply(null, args);
  }

  _onEditCommand_upload() {
    if (this.url != null) URL.revokeObjectURL(this.url);

    var typedArray = new Uint8Array(this.spriteAsset.pub.image);
    var blob = new Blob([ typedArray ], {type: "image/*"});
    this.url = URL.createObjectURL(blob);
    var image = this.spriteAsset.pub.texture.image;
    image.src = this.url;
    image.addEventListener("load", () => { this.spriteAsset.pub.texture.needsUpdate = true; });

    if (this.editAssetCallbacks != null) this.editAssetCallbacks.sprite.upload(this.url);
    return false
  }

  _onEditCommand_setProperty(path: string, value: any) {
    this.spriteRenderer.setSprite(this.spriteAsset.pub);
    if (this.animationId != null) this._playAnimation();
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
    this.spriteRenderer.setSprite(null);
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "spriteAssetId": {
        if (this.spriteAssetId != null) this.client.unsubAsset(this.spriteAssetId, this.spriteSubscriber);
        this.spriteAssetId = value

        this.spriteAsset = null
        this.spriteRenderer.setSprite(null);

        if (this.spriteAssetId != null) this.client.subAsset(this.spriteAssetId, "sprite", this.spriteSubscriber);
        break;
      }

      case "animationId": {
        this.animationId = value

        if (this.spriteAsset != null) {
          if (this.animationId != null) this._playAnimation();
          else this.spriteRenderer.setAnimation(null);
        }
        break;
      }
    }
  }
}
export = SpriteRendererUpdater;
