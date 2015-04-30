let THREE = SupEngine.THREE;

import TextRendererUpdater from "./TextRendererUpdater";
import TextRendererGeometry from "./TextRendererGeometry";
import { FontPub } from "../data/FontAsset";

export default class TextRenderer extends SupEngine.ActorComponent {
  static Updater = TextRendererUpdater;

  texture: THREE.Texture;
  threeMesh: THREE.Mesh;

  text: string;
  font: FontPub;
  options: {alignment: string; size?: number; color?: string;};

  constructor(actor: SupEngine.Actor) {
    super(actor, "TextRenderer");
  }

  setText(text: string) {
    this.text = text;
    this._createMesh();
  }
  setFont(font: FontPub ) {
    this.font = font;
    this._createMesh();
  }
  setOptions(options: {alignment: string; size?: number; color?: string;}) {
    if (options.alignment == null) options.alignment = "center";
    this.options = options;
    this._createMesh();
  }

  _createMesh() {
    if (this.threeMesh != null) this.clearMesh();
    if (this.text == null || this.font == null) return;

    if (this.font.isBitmap) this._createBitmapMesh();
    else this._createFontMesh();

    this.actor.threeObject.add(this.threeMesh);
    let scale = 1 / this.font.pixelsPerUnit;
    this.threeMesh.scale.set(scale, scale, scale);
    this.threeMesh.updateMatrixWorld(false);
  }

  _createFontMesh() {
    let fontSize = (this.options.size != null) ? this.options.size : this.font.size;

    let canvas = document.createElement("canvas");
    let ctx = <CanvasRenderingContext2D>canvas.getContext("2d");
    ctx.font = `${fontSize}px ${this.font.name}`;
    let width = Math.max(1, ctx.measureText(this.text).width);
    let height = fontSize * 2;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = (this.options.color != null && this.options.color !== "") ? this.options.color : this.font.color;
    ctx.font = `${fontSize}px ${this.font.name}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillText(this.text, width / 2, height / 2);

    this.texture = new THREE.Texture(canvas);
    if (this.font.filtering === "pixelated") {
      this.texture.magFilter = SupEngine.THREE.NearestFilter;
      this.texture.minFilter = SupEngine.THREE.NearestFilter;
    }
    this.texture.needsUpdate = true;

    let geometry = new THREE.PlaneBufferGeometry(width, height);
    let material = new THREE.MeshBasicMaterial({
      map: this.texture,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
      transparent: true
    });

    this.threeMesh = new THREE.Mesh(geometry, material);
    switch (this.options.alignment) {
      case "left":  this.threeMesh.position.setX( (<any>this.threeMesh.geometry).width / 2 / this.font.pixelsPerUnit); break;
      case "right": this.threeMesh.position.setX(-(<any>this.threeMesh.geometry).width / 2 / this.font.pixelsPerUnit); break;
    }
  }

  _createBitmapMesh() {
    let geometry = new TextRendererGeometry(this.font.gridWidth * this.text.length, this.font.gridHeight, this.text.length, 1);
    let material = new THREE.MeshBasicMaterial({
      map: this.font.texture,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    });
    this.threeMesh = new THREE.Mesh(geometry, material);
    switch (this.options.alignment) {
      case "center":  this.threeMesh.position.setX(-geometry.width / 2 / this.font.pixelsPerUnit); break;
      case "right":   this.threeMesh.position.setX(-geometry.width / this.font.pixelsPerUnit); break;
    }

    let uvs = geometry.getAttribute("uv");
    uvs.needsUpdate = true;

    let charsByRow = this.font.texture.image.width / this.font.gridWidth;
    let y = 0;
    for (let x = 0; x < this.text.length; x++) {
      let index: number;
      if (this.font.charset == null) index = this.text.charCodeAt(x) - this.font.charsetOffset;
      else index = this.font.charset.indexOf(this.text[x]);

      let tileX = index % charsByRow;
      let tileY = Math.floor(index / charsByRow);

      let left   = ((tileX)     * this.font.gridWidth + 0.2) / this.font.texture.image.width;
      let right  = ((tileX + 1) * this.font.gridWidth - 0.2) / this.font.texture.image.width;
      let bottom = 1 - ((tileY+1) * this.font.gridHeight - 0.2) / this.font.texture.image.height;
      let top    = 1 - (tileY     * this.font.gridHeight + 0.2) / this.font.texture.image.height;

      let quadIndex = (x + y * this.text.length);
      uvs.array[quadIndex * 8 + 0] = left
      uvs.array[quadIndex * 8 + 1] = bottom

      uvs.array[quadIndex * 8 + 2] = right
      uvs.array[quadIndex * 8 + 3] = bottom

      uvs.array[quadIndex * 8 + 4] = right
      uvs.array[quadIndex * 8 + 5] = top

      uvs.array[quadIndex * 8 + 6] = left
      uvs.array[quadIndex * 8 + 7] = top
    }
  }

  clearMesh() {
    if (this.threeMesh == null) return;

    this.actor.threeObject.remove(this.threeMesh);
    this.threeMesh.geometry.dispose();
    this.threeMesh.material.dispose();
    this.threeMesh = null;
    if (this.texture != null) {
      this.texture.dispose();
      this.texture = null;
    }
  }

  _destroy() {
    this.clearMesh();
    super._destroy();
  }
}
