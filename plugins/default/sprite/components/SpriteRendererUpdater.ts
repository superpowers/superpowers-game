import SpriteAsset from "../data/SpriteAsset";
import SpriteRenderer from "./SpriteRenderer";
import { SpriteRendererConfigPub } from "../componentConfigs/SpriteRendererConfig";

export default class SpriteRendererUpdater {
  spriteAssetId: string;
  spriteAsset: SpriteAsset;

  animationId: string;
  looping = true;

  materialType: string;
  shaderAssetId: string;
  shaderPub: any;
  overrideOpacity = false;
  opacity: number;

  private spriteSubscriber: SupClient.AssetSubscriber;
  private shaderSubscriber: SupClient.AssetSubscriber;

  constructor(private client: SupClient.ProjectClient, public spriteRenderer: SpriteRenderer, config: SpriteRendererConfigPub,
  private externalSubscriber?: SupClient.AssetSubscriber) {
    this.spriteAssetId = config.spriteAssetId;
    this.animationId = config.animationId;
    this.materialType = config.materialType;
    this.shaderAssetId = config.shaderAssetId;

    if (this.externalSubscriber == null) this.externalSubscriber = {};

    this.spriteRenderer.horizontalFlip = config.horizontalFlip;
    this.spriteRenderer.verticalFlip = config.verticalFlip;
    this.spriteRenderer.castShadow = config.castShadow;
    this.spriteRenderer.receiveShadow = config.receiveShadow;

    this.overrideOpacity = config.overrideOpacity;
    this.opacity = config.opacity;
    if (this.overrideOpacity) this.spriteRenderer.setOpacity(this.opacity);
    const hex = parseInt(config.color, 16);
    const r = (hex >> 16 & 255) / 255;
    const g = (hex >> 8 & 255) / 255;
    const b = (hex & 255) / 255;
    this.spriteRenderer.setColor(r, g, b);

    this.spriteSubscriber = {
      onAssetReceived: this.onSpriteAssetReceived,
      onAssetEdited: this.onSpriteAssetEdited,
      onAssetTrashed: this.onSpriteAssetTrashed
    };

    this.shaderSubscriber = {
      onAssetReceived: this.onShaderAssetReceived,
      onAssetEdited: this.onShaderAssetEdited,
      onAssetTrashed: this.onShaderAssetTrashed
    };

    if (this.spriteAssetId != null) this.client.subAsset(this.spriteAssetId, "sprite", this.spriteSubscriber);
    if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
  }

  destroy() {
    if (this.spriteAssetId != null) this.client.unsubAsset(this.spriteAssetId, this.spriteSubscriber);
    if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
  }

  private onSpriteAssetReceived = (assetId: string, asset: SpriteAsset) => {
    if (!this.overrideOpacity) this.spriteRenderer.opacity = asset.pub.opacity;
    this.prepareMaps(asset.pub.textures, () => {
      this.spriteAsset = asset;
      this.setSprite();

      if (this.externalSubscriber.onAssetReceived != null) this.externalSubscriber.onAssetReceived(assetId, asset);
    });
  }

  private prepareMaps(textures: { [name: string]: THREE.Texture }, callback: () => any) {
    const textureNames = Object.keys(textures);
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
      const image = textures[key].image;
      if (!image.complete) image.addEventListener("load", onTextureLoaded);
      else onTextureLoaded();
    });
  }

  private setSprite() {
    if (this.spriteAsset == null || (this.materialType === "shader" && this.shaderPub == null)) {
      this.spriteRenderer.setSprite(null);
      return;
    }

    this.spriteRenderer.setSprite(this.spriteAsset.pub, this.materialType, this.shaderPub);
    if (this.animationId != null) this.playAnimation();
  }

  private playAnimation() {
    const animation = this.spriteAsset.animations.byId[this.animationId];
    if (animation == null) return;

    this.spriteRenderer.setAnimation(animation.name, this.looping);
  }

  private onSpriteAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    let callEditCallback = true;
    const commandFunction = this.onEditCommands[command];
    if (commandFunction != null && commandFunction.apply(this, args) === false) callEditCallback = false;

    if (callEditCallback && this.externalSubscriber.onAssetEdited != null) {
      this.externalSubscriber.onAssetEdited(assetId, command, ...args);
    }
  }

  private onEditCommands: { [command: string]: Function; } = {
    setMaps: (maps: any) => {
      // TODO: Only update the maps that changed, don't recreate the whole model
      this.prepareMaps(this.spriteAsset.pub.textures, () => {
        this.setSprite();
        if (this.externalSubscriber.onAssetEdited != null) {
          this.externalSubscriber.onAssetEdited(this.spriteAsset.id, "setMaps");
        }
      });
      return false;
    },

    setMapSlot: (slot: string, name: string) => { this.setSprite(); },

    deleteMap: (name: string) => { this.setSprite(); },

    setProperty: (path: string, value: any) => {
      switch (path) {
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

        default: this.setSprite(); break;
      }
    },

    newAnimation: () => {
      this.spriteRenderer.updateAnimationsByName();
      this.playAnimation();
    },

    deleteAnimation: () => {
      this.spriteRenderer.updateAnimationsByName();
      this.playAnimation();
    },

    setAnimationProperty: () => {
      this.spriteRenderer.updateAnimationsByName();
      this.playAnimation();
    }
  };

  private onSpriteAssetTrashed = (assetId: string) => {
    this.spriteAsset = null;
    this.spriteRenderer.setSprite(null);

    if (this.externalSubscriber.onAssetTrashed != null) this.externalSubscriber.onAssetTrashed(assetId);
  }

  private onShaderAssetReceived = (assetId: string, asset: { pub: any} ) => {
    this.shaderPub = asset.pub;
    this.setSprite();
  }

  private onShaderAssetEdited = (id: string, command: string, ...args: any[]) => {
    if (command !== "editVertexShader" && command !== "editFragmentShader") this.setSprite();
  }

  private onShaderAssetTrashed = () => {
    this.shaderPub = null;
    this.setSprite();
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
        this.setSprite();
        break;

      case "looping":
        this.looping = value;
        if (this.animationId != null) this.playAnimation();
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
        const hex = parseInt(value, 16);
        const r = (hex >> 16 & 255) / 255;
        const g = (hex >> 8 & 255) / 255;
        const b = (hex & 255) / 255;
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
        this.setSprite();
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
