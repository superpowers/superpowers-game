let THREE = SupEngine.THREE;

import TextRendererUpdater from "./TextRendererUpdater";
import TextRendererGeometry from "./TextRendererGeometry";
import { FontPub } from "../data/FontAsset";

export default class TextRenderer extends SupEngine.ActorComponent {
  static Updater = TextRendererUpdater;

  texture: THREE.Texture;
  threeMeshes: THREE.Mesh[] = [];

  text: string;
  font: FontPub;
  options: {alignment: string; verticalAlignment: string; size?: number; color?: string;};
  opacity = 1;

  constructor(actor: SupEngine.Actor) {
    super(actor, "TextRenderer");
  }

  setText(text: string) {
    this.text = text;
    this._createMesh();
  }
  setFont(font: FontPub) {
    this.font = font;
    this._createMesh();
  }
  setOptions(options: {alignment: string; verticalAlignment: string; size?: number; color?: string;}) {
    if (options.alignment == null) options.alignment = "center";
    if (options.verticalAlignment == null) options.verticalAlignment = "center";
    this.options = options;
    this._createMesh();
  }

  setOpacity(opacity: number) {
    this.opacity = opacity;
    for (let mesh of this.threeMeshes) mesh.material.opacity = this.opacity;
  }

  _createMesh() {
    this.clearMesh();
    if (this.text == null || this.font == null) return;

    if (this.font.isBitmap) this._createBitmapMesh();
    else this._createFontMesh();

    for (let threeMesh of this.threeMeshes) {
      this.actor.threeObject.add(threeMesh);
      let scale = 1 / this.font.pixelsPerUnit;
      threeMesh.scale.set(scale, scale, scale);
      threeMesh.updateMatrixWorld(false);
    }
  }

  _createFontMesh() {
    let fontSize = (this.options.size != null) ? this.options.size : this.font.size;
    let texts = this.text.split("\n");

    let canvas = document.createElement("canvas");
    let ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
    ctx.font = `${fontSize}px ${this.font.name}`;
    let width = 1;
    for (let text of texts) width = Math.max(width, ctx.measureText(text).width);
    
    // Arbitrary value that should be enough for most fonts
    // We might want to make it configurable in the future
    let heightBorder = fontSize * 0.2;

    let heightWithoutBorder = fontSize * texts.length;
    let height = heightWithoutBorder + heightBorder * 2;
    canvas.width = width;
    canvas.height = height;

    let color = (this.options.color != null) ? this.options.color : this.font.color;
    ctx.fillStyle = `#${color}`;
    ctx.font = `${fontSize}px ${this.font.name}`;
    ctx.textBaseline = "middle";

    ctx.textAlign = this.options.alignment;
    let x = width / 2;
    switch (this.options.alignment) {
      case "left" : x = 0; break;
      case "right": x = width; break;
    }

    for (let index = 0; index < texts.length; index++) {
      ctx.fillText(texts[index], x, heightBorder + (0.5 + (index - (texts.length - 1) / 2) / texts.length) * heightWithoutBorder);
    }

    this.texture = new THREE.Texture(canvas);
    if (this.font.filtering === "pixelated") {
      this.texture.magFilter = SupEngine.THREE.NearestFilter;
      this.texture.minFilter = SupEngine.THREE.NearestFilter;
    } else {
      // See https://github.com/mrdoob/three.js/blob/4582bf1276c30c238e415cb79f4871e8560d102d/src/renderers/WebGLRenderer.js#L5664
      this.texture.minFilter = SupEngine.THREE.LinearFilter;
    }
    this.texture.needsUpdate = true;

    let geometry = new THREE.PlaneBufferGeometry(width, height);
    let material = new THREE.MeshBasicMaterial({
      map: this.texture,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: this.opacity
    });

    this.threeMeshes[0] = new THREE.Mesh(geometry, material);
    switch (this.options.alignment) {
      case "left":  this.threeMeshes[0].position.setX( width / 2 / this.font.pixelsPerUnit); break;
      case "right": this.threeMeshes[0].position.setX(-width / 2 / this.font.pixelsPerUnit); break;
    }
    switch (this.options.verticalAlignment) {
      case "top":    this.threeMeshes[0].position.setY(-height / 2 / this.font.pixelsPerUnit); break;
      case "bottom": this.threeMeshes[0].position.setY( height / 2 / this.font.pixelsPerUnit); break;
    }
  }

  _createBitmapMesh() {
    let texts = this.text.split("\n");
    for (let index = 0; index < texts.length; index++) {
      let text = texts[index];

      let geometry = new TextRendererGeometry(this.font.gridWidth * text.length, this.font.gridHeight, text.length, 1);
      let material = new THREE.MeshBasicMaterial({
        map: this.font.texture,
        alphaTest: 0.1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: this.opacity
      });
      this.threeMeshes[index] = new THREE.Mesh(geometry, material);
      switch (this.options.alignment) {
        case "center":  this.threeMeshes[index].position.setX(-geometry.width / 2 / this.font.pixelsPerUnit); break;
        case "right":   this.threeMeshes[index].position.setX(-geometry.width / this.font.pixelsPerUnit); break;
      }

      let y: number;
      switch (this.options.verticalAlignment) {
        case "center": y = (0.5 + (index - (texts.length - 1) / 2 )) * this.font.gridHeight / this.font.pixelsPerUnit; break;
        case "top":    y = (1 + index) * this.font.gridHeight / this.font.pixelsPerUnit; break;
        case "bottom": y = (index - texts.length + 1) * this.font.gridHeight / this.font.pixelsPerUnit; break;
      }
      this.threeMeshes[index].position.setY(-y);

      let uvs = geometry.getAttribute("uv");
      uvs.needsUpdate = true;

      let charsByRow = this.font.texture.image.width / this.font.gridWidth;
      for (let x = 0; x < text.length; x++) {
        let index: number;
        if (this.font.charset == null) index = text.charCodeAt(x) - this.font.charsetOffset;
        else index = this.font.charset.indexOf(text[x]);

        let tileX = index % charsByRow;
        let tileY = Math.floor(index / charsByRow);

        let left   = ((tileX)     * this.font.gridWidth + 0.2) / this.font.texture.image.width;
        let right  = ((tileX + 1) * this.font.gridWidth - 0.2) / this.font.texture.image.width;
        let bottom = 1 - ((tileY+1) * this.font.gridHeight - 0.2) / this.font.texture.image.height;
        let top    = 1 - (tileY     * this.font.gridHeight + 0.2) / this.font.texture.image.height;

        uvs.array[x * 8 + 0] = left;
        uvs.array[x * 8 + 1] = bottom;

        uvs.array[x * 8 + 2] = right;
        uvs.array[x * 8 + 3] = bottom;

        uvs.array[x * 8 + 4] = right;
        uvs.array[x * 8 + 5] = top;

        uvs.array[x * 8 + 6] = left;
        uvs.array[x * 8 + 7] = top;
      }
    }
  }

  clearMesh() {
    for (let threeMesh of this.threeMeshes) {
      this.actor.threeObject.remove(threeMesh);
      threeMesh.geometry.dispose();
      threeMesh.material.dispose();
      threeMesh = null;
    }
    this.threeMeshes.length = 0;

    if (this.texture != null) {
      this.texture.dispose();
      this.texture = null;
    }
  }

  _destroy() {
    this.clearMesh();
    super._destroy();
  }

  setIsLayerActive(active: boolean) { for (let threeMesh of this.threeMeshes) threeMesh.visible = active; }
}
