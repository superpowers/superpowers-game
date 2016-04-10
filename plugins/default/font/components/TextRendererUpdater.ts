import FontAsset from "../data/FontAsset";
import TextRenderer from "./TextRenderer";
import { TextRendererConfigPub } from "../componentConfigs/TextRendererConfig";

export default class TextRendererUpdater {
  fontAssetId: string;
  text: string;
  options: {
    alignment: string;
    verticalAlignment: string;
    size?: number;
    color?: string;
  };

  overrideOpacity: boolean;
  opacity: number;

  private fontSubscriber: SupClient.AssetSubscriber;
  fontAsset: FontAsset;

  constructor(private client: SupClient.ProjectClient, public textRenderer: TextRenderer, config: TextRendererConfigPub,
  private externalSubscriber?: SupClient.AssetSubscriber) {
    this.fontAssetId = config.fontAssetId;
    this.text = config.text;
    this.options = {
      alignment: config.alignment,
      verticalAlignment: config.verticalAlignment,
      size: config.size,
      color: config.color,
    };

    this.overrideOpacity = config.overrideOpacity;
    this.opacity = config.opacity;
    if (this.overrideOpacity) this.textRenderer.setOpacity(this.opacity);

    if (this.externalSubscriber == null) this.externalSubscriber = {};

    this.fontSubscriber = {
      onAssetReceived: this.onFontAssetReceived,
      onAssetEdited: this.onFontAssetEdited,
      onAssetTrashed: this.onFontAssetTrashed
    };
    if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "font", this.fontSubscriber);
  }

  destroy() {
    if (this.fontAssetId != null) this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
  }

  config_setProperty(path: string, value: any) {
    switch (path) {
      case "fontAssetId": {
        if (this.fontAssetId != null) this.client.unsubAsset(this.fontAssetId, this.fontSubscriber);
        this.fontAssetId = value;

        this.fontAsset = null;
        this.textRenderer.setFont(null);

        if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "font", this.fontSubscriber);
      } break;

      case "text": {
        this.text = value;
        this.textRenderer.setText(this.text);
      } break;

      case "alignment":
      case "verticalAlignment":
      case "size":
      case "color": {
        (this.options as any)[path] = (value !== "") ? value : null;
        this.textRenderer.setOptions(this.options);
      } break;

      case "overrideOpacity":
      case "opacity": {
        (this as any)[path] = value;

        if (this.overrideOpacity) this.textRenderer.setOpacity(this.opacity);
        else if (this.fontAsset != null) this.textRenderer.setOpacity(this.fontAsset.pub.opacity);
      } break;
    }
  }

  private onFontAssetReceived = (assetId: string, asset: FontAsset) => {
    this.fontAsset = asset;

    this.textRenderer.setText(this.text);
    this.textRenderer.setOptions(this.options);

    if (!this.overrideOpacity) this.textRenderer.opacity = asset.pub.opacity;
    this.setupFont();

    if (this.externalSubscriber.onAssetReceived) this.externalSubscriber.onAssetReceived(assetId, asset);
  };

  private onFontAssetEdited = (assetId: string, command: string, ...args: any[]) => {
    const commandFunction = this.onEditCommands[command];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.externalSubscriber.onAssetEdited) this.externalSubscriber.onAssetEdited(assetId, command, ...args);
  };

  private setupFont() {
    this.textRenderer.clearMesh();

    if (this.fontAsset.pub.isBitmap) {
      if (this.fontAsset.pub.texture != null) {
        let image = this.fontAsset.pub.texture.image;
        if (image.complete) this.textRenderer.setFont(this.fontAsset.pub);
        else image.addEventListener("load", () => { this.textRenderer.setFont(this.fontAsset.pub); });
      }
    } else {
      if (this.fontAsset.font == null) this.textRenderer.setFont(this.fontAsset.pub);
      else {
        this.fontAsset.font.load().then(
          () => { this.textRenderer.setFont(this.fontAsset.pub); },
          () => { this.textRenderer.setFont(this.fontAsset.pub); }
        );
      }
    }
  }

  private onEditCommands: { [command: string]: Function; } = {
    upload: () => { this.setupFont(); },

    setProperty: (path: string, value: any) => {
      switch(path) {
        case "isBitmap": this.setupFont(); break;
        case "opacity": if (!this.overrideOpacity) this.textRenderer.setOpacity(value); break;
        default: this.textRenderer.setFont(this.fontAsset.pub);
      }
    }
  };

  private onFontAssetTrashed = (assetId: string) => {
    this.textRenderer.clearMesh();
    if (this.externalSubscriber.onAssetTrashed != null) this.externalSubscriber.onAssetTrashed(assetId);
  };
}
