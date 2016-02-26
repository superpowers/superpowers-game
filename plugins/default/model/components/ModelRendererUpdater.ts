import ModelAsset from "../data/ModelAsset";
import ModelRenderer from "./ModelRenderer";
import { ModelRendererConfigPub } from "../componentConfigs/ModelRendererConfig";

export default class ModelRendererUpdater {
  modelAssetId: string;
  animationId: string;
  overrideOpacity = false;

  modelAsset: ModelAsset = null;

  materialType: string;
  shaderAssetId: string;
  shaderPub: any;

  private modelSubscriber: SupClient.AssetSubscriber;
  private shaderSubscriber: SupClient.AssetSubscriber;

  constructor(private client: SupClient.ProjectClient, public modelRenderer: ModelRenderer, config: ModelRendererConfigPub,
  private externalSubscriber?: SupClient.AssetSubscriber) {
    if (this.externalSubscriber == null) this.externalSubscriber = {};

    this.modelAssetId = config.modelAssetId;
    this.animationId = config.animationId;
    this.materialType = config.materialType;
    this.shaderAssetId = config.shaderAssetId;

    if (config.castShadow != null) this.modelRenderer.castShadow = config.castShadow;
    if (config.receiveShadow != null) this.modelRenderer.receiveShadow = config.receiveShadow;

    if (config.overrideOpacity != null) {
      this.overrideOpacity = config.overrideOpacity;
      if (this.overrideOpacity) this.modelRenderer.opacity = config.opacity;
    }

    if (config.color != null) {
      const hex = parseInt(config.color, 16);
      this.modelRenderer.color.r = (hex >> 16 & 255) / 255;
      this.modelRenderer.color.g = (hex >> 8 & 255) / 255;
      this.modelRenderer.color.b = (hex & 255) / 255;
    }

    this.modelSubscriber = {
      onAssetReceived: this.onModelAssetReceived,
      onAssetEdited: this.onModelAssetEdited,
      onAssetTrashed: this.onModelAssetTrashed
    };

    this.shaderSubscriber = {
      onAssetReceived: this.onShaderAssetReceived,
      onAssetEdited: this.onShaderAssetEdited,
      onAssetTrashed: this.onShaderAssetTrashed
    };

    if (this.modelAssetId != null) this.client.subAsset(this.modelAssetId, "model", this.modelSubscriber);
    if (this.shaderAssetId != null) this.client.subAsset(this.shaderAssetId, "shader", this.shaderSubscriber);
  }

  destroy() {
    if (this.modelAssetId != null) this.client.unsubAsset(this.modelAssetId, this.modelSubscriber);
    if (this.shaderAssetId != null) this.client.unsubAsset(this.shaderAssetId, this.shaderSubscriber);
  }

  private onModelAssetReceived = (assetId: string, asset: ModelAsset) => {
    if (this.modelRenderer.opacity == null) this.modelRenderer.opacity = asset.pub.opacity;
    this.prepareMaps(asset.pub.textures, () => {
      this.modelAsset = asset;
      this.setModel();
      if (this.externalSubscriber.onAssetReceived != null) this.externalSubscriber.onAssetReceived(assetId, asset);
    });
  };

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

  private setModel() {
    if (this.modelAsset == null || (this.materialType === "shader" && this.shaderPub == null)) {
      this.modelRenderer.setModel(null);
      return;
    }

    this.modelRenderer.setModel(this.modelAsset.pub, this.materialType, this.shaderPub);
    if (this.animationId != null) this.playAnimation();
  }

  private playAnimation() {
    const animation = this.modelAsset.animations.byId[this.animationId];
    this.modelRenderer.setAnimation((animation != null) ? animation.name : null);
  }

  private onModelAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    const commandFunction = this.onEditCommands[command];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.externalSubscriber.onAssetEdited != null) this.externalSubscriber.onAssetEdited(assetId, command, ...args);
  };

  private onEditCommands: { [command: string]: Function; } = {
    setModel: () => {
      this.setModel();
    },

    setMaps: (maps: any) => {
      // TODO: Only update the maps that changed, don't recreate the whole model
      this.prepareMaps(this.modelAsset.pub.textures, () => {
        this.setModel();
      });
    },

    newAnimation: (animation: any, index: number) => {
      this.modelRenderer.updateAnimationsByName();
      this.playAnimation();
    },

    deleteAnimation: (id: string) => {
      this.modelRenderer.updateAnimationsByName();
      this.playAnimation();
    },

    setAnimationProperty: (id: string, key: string, value: any) => {
      this.modelRenderer.updateAnimationsByName();
      this.playAnimation();
    },

    setMapSlot: (slot: string, name: string) => { this.setModel(); },

    deleteMap: (name: string) => { this.setModel(); },

    setProperty: (path: string, value: any) => {
      switch(path) {
        case "unitRatio":
          this.modelRenderer.setUnitRatio(value);
          break;
        case "opacity":
          if (!this.overrideOpacity) this.modelRenderer.setOpacity(value);
          break;
      }
    }
  };

  private onModelAssetTrashed = () => {
    this.modelAsset = null;
    this.modelRenderer.setModel(null);
  };

  private onShaderAssetReceived = (assetId: string, asset: { pub: any} ) => {
    this.shaderPub = asset.pub;
    this.setModel();
  };

  private onShaderAssetEdited = (id: string, command: string, ...args: any[]) => {
    if (command !== "editVertexShader" && command !== "editFragmentShader") this.setModel();
  };

  private onShaderAssetTrashed = () => {
    this.shaderPub = null;
    this.setModel();
  };

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
        if (this.modelAsset != null) this.playAnimation();
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
        this.modelRenderer.setColor((hex >> 16 & 255) / 255, (hex >> 8 & 255) / 255, (hex & 255) / 255);
        break;

      case "materialType":
        this.materialType = value;
        this.setModel();
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
