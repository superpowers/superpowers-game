let THREE = SupEngine.THREE;
import FontAsset from "../data/FontAsset";
import TextRenderer from "./TextRenderer";

// FontFace is a very new feature (supported in Chrome only). Not available in lib.d.ts just yet
declare let FontFace: any;

export default class TextRendererUpdater {

  client: SupClient.ProjectClient;
  textRenderer: TextRenderer;

  receiveAssetCallbacks: any;
  editAssetCallbacks: any;

  fontAssetId: string;
  text: string;
  options: {alignment: string; size?: number; color?: string;};

  fontSubscriber: {
    onAssetReceived: (assetId: string, asset: any) => any;
    onAssetEdited: (id: string, command: string, ...args: any[]) => any;
    onAssetTrashed: (assetId: string) => any};

  fontAsset: FontAsset;
  url: string;
  font: any;
  texture: THREE.Texture;

  constructor(client: SupClient.ProjectClient, textRenderer: TextRenderer, config: any, receiveAssetCallbacks?: any, editAssetCallbacks?: any) {
    this.client = client;
    this.textRenderer = textRenderer;
    this.receiveAssetCallbacks = receiveAssetCallbacks;
    this.editAssetCallbacks = editAssetCallbacks;

    this.fontAssetId = config.fontAssetId;
    this.text = config.text;
    this.options = {alignment: config.alignment, size: config.size, color: config.color};

    this.fontSubscriber = {
      onAssetReceived: this._onFontAssetReceived,
      onAssetEdited: this._onFontAssetEdited,
      onAssetTrashed: this._onFontAssetTrashed
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
        this.fontAssetId = value

        this.fontAsset = null
        this.textRenderer.clearMesh();

        if (this.fontAssetId != null) this.client.subAsset(this.fontAssetId, "font", this.fontSubscriber);
        break;
      }
      case "text": {
        this.text = value;
        this.textRenderer.setText(this.text);
        break;
      }
      case "alignment":
      case "size":
      case "color": {
        (<any>this.options)[path] = (value != "") ? value : null;
        this.textRenderer.setOptions(this.options);
        break;
      }
    }
  }

  _onFontAssetReceived = (assetId: string, asset: FontAsset) => {
    this.fontAsset = asset;

    this.textRenderer.setText(this.text);
    this.textRenderer.setOptions(this.options);
    this._setupFont();

    if (this.receiveAssetCallbacks != null) this.receiveAssetCallbacks.font(null);
  }

  _onFontAssetEdited = (id: string, command: string, ...args: any[]) => {
    let commandFunction = (<any>this)[`_onEditCommand_${command}`];
    if (commandFunction != null) commandFunction.apply(this, args);

    if (this.editAssetCallbacks != null) {
      let editCallback = this.editAssetCallbacks.font[command];
      if (editCallback != null) editCallback.apply(null, args);
    }
  }

  _setupFont() {
    this.textRenderer.clearMesh();

    if (this.fontAsset.pub.isBitmap) {
      if ((<any>this.fontAsset.pub.bitmap).byteLength !== 0) {
        if (this.fontAsset.pub.texture == null) this._loadBitmapFont();
        else this.textRenderer.setFont(this.fontAsset.pub);
      }
    } else {
      if (this.font == null && (<any>this.fontAsset.pub.font).byteLength !== 0) this._loadFont();
      else this.textRenderer.setFont(this.fontAsset.pub);
    }
  }

  _loadFont() {
    if (this.url != null) URL.revokeObjectURL(this.url);
    if (this.font != null) delete this.font;

    let typedArray = new Uint8Array(<any>this.fontAsset.pub.font);
    let blob = new Blob([ typedArray ], { type: "font/*" });
    this.url = URL.createObjectURL(blob);
    this.fontAsset.pub.name = `Font${this.fontAssetId}`;
    this.font = new FontFace(this.fontAsset.pub.name, `url(${this.url})`);
    (<any>document).fonts.add(this.font);
    this.font.load().then(() => { this.textRenderer.setFont(this.fontAsset.pub) });
  }

  _loadBitmapFont() {
    let image = (this.fontAsset.pub.texture != null) ? this.fontAsset.pub.texture.bitmap : null;
    if (image == null) {
      if (this.url != null) URL.revokeObjectURL(this.url);

      image = new Image();
      let typedArray = new Uint8Array(<any>this.fontAsset.pub.bitmap);
      let blob = new Blob([ typedArray ], { type: "image/*" });
      this.url = URL.createObjectURL(blob);
      image.src = this.url;

      this.fontAsset.pub.texture = new THREE.Texture(image);
      this._setupFiltering();
    }

    if (! image.complete) {
      let onImageLoaded = () => {
        image.removeEventListener("load", onImageLoaded);
        this.fontAsset.pub.texture.needsUpdate = true
        this.textRenderer.setFont(this.fontAsset.pub);
      };

      image.addEventListener("load", onImageLoaded);
    }
  }

  _setupFiltering() {
    if (this.fontAsset.pub.filtering === "pixelated") {
      this.fontAsset.pub.texture.magFilter = THREE.NearestFilter;
      this.fontAsset.pub.texture.minFilter = THREE.NearestFilter;
    } else {
      this.fontAsset.pub.texture.magFilter = THREE.LinearFilter;
      this.fontAsset.pub.texture.minFilter = THREE.LinearFilter;
    }
    this.fontAsset.pub.texture.needsUpdate = true;
  }

  _onEditCommand_upload() {
    if (this.fontAsset.pub.isBitmap) this._loadBitmapFont();
    else this._loadFont();
  }

  _onEditCommand_setProperty(path: string) {
    if (path === "isBitmap") this._setupFont();
    else if (path === "filtering" && this.fontAsset.pub.isBitmap) this._setupFiltering();
    else this.textRenderer.setFont(this.fontAsset.pub);
  }

  _onFontAssetTrashed = () => {
    this.textRenderer.clearMesh();
    if (this.editAssetCallbacks != null) SupClient.onAssetTrashed();
  }
}
