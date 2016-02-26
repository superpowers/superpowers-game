import FontAsset from "../data/FontAsset";
import TextRenderer from "./TextRenderer";
import { TextRendererConfigPub } from "../componentConfigs/TextRendererConfig";

export default class TextRendererUpdater {
  client: SupClient.ProjectClient;
  textRenderer: TextRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  fontAssetId: string;
  text: string;
  options: {
    alignment: string;
    verticalAlignment: string;
    size?: number;
    color?: string;
  };

  fontSubscriber: {
    onAssetReceived: (assetId: string, asset: any) => any;
    onAssetEdited: (id: string, command: string, ...args: any[]) => any;
    onAssetTrashed: (assetId: string) => any};

  fontAsset: FontAsset;

  constructor(client: SupClient.ProjectClient, textRenderer: TextRenderer, config: TextRendererConfigPub,
  receiveAssetCallbacks?: any, editAssetCallbacks?: any) {
    this.client = client;
    this.textRenderer = textRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.fontAssetId = config.fontAssetId;
    this.text = config.text;
    this.options = {
      alignment: config.alignment,
      verticalAlignment: config.verticalAlignment,
      size: config.size,
      color: config.color
    };

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
        (<any>this.options)[path] = (value !== "") ? value : null;
        this.textRenderer.setOptions(this.options);
      } break;
    }
  }

  private onFontAssetReceived = (assetId: string, asset: FontAsset) => {
    this.fontAsset = asset;

    this.textRenderer.setText(this.text);
    this.textRenderer.setOptions(this.options);
    this._setupFont();

    if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.font(null);
  };

  private onFontAssetEdited = (id: string, command: string, ...args: any[]) => {
    let commandFunction = (<any>this)[`onEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.font[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  };

  _setupFont() {
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

  onEditCommand_upload() { this._setupFont(); }

  onEditCommand_setProperty(path: string) {
    if (path === "isBitmap") this._setupFont();
    else this.textRenderer.setFont(this.fontAsset.pub);
  }

  private onFontAssetTrashed = () => {
    this.textRenderer.clearMesh();
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  };
}
