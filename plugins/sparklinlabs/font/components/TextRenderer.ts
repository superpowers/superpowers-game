var THREE = SupEngine.THREE;

class TextRenderer extends SupEngine.ActorComponent {
  static Updater = require("./TextRendererUpdater");

  texture: THREE.Texture;
  threeMesh: THREE.Mesh;

  text: string;
  font: any;
  options: {alignment: string; size?: number; color?: string;};

  constructor(actor: SupEngine.Actor) {
    super(actor, "TextRenderer");
  }

  setText(text: string) {
    this.text = text;
    this._createMesh();
  }
  setFont(font: any ) {
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

    var fontSize = (this.options.size != null) ? this.options.size : this.font.size;

    var canvas = document.createElement("canvas");
    var ctx = canvas.getContext("2d");
    ctx.font = `${fontSize}px ${this.font.name}`;
    var width = Math.max(1, ctx.measureText(this.text).width);
    var height = fontSize * 2;
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

    var geometry = new THREE.PlaneBufferGeometry(width, height);
    var material = new THREE.MeshBasicMaterial({
      map: this.texture,
      alphaTest: 0.01,
      side: THREE.DoubleSide,
      transparent: true
    });

    this.threeMesh = new THREE.Mesh(geometry, material);
    this.actor.threeObject.add(this.threeMesh);
    var scale = 1 / this.font.pixelsPerUnit;
    this.threeMesh.scale.set(scale, scale, scale);

    switch (this.options.alignment) {
      case "left": this.threeMesh.position.setX(width / 2 * scale); break;
      case "right": this.threeMesh.position.setX(-width / 2 * scale); break;
    }
    this.threeMesh.updateMatrixWorld(false);
  }

  clearMesh() {
    if (this.threeMesh == null) return;
    this.actor.threeObject.remove(this.threeMesh);
    this.threeMesh.geometry.dispose();
    this.threeMesh.material.dispose();
    this.threeMesh = null;
    this.texture.dispose();
    this.texture = null;
  }

  _destroy() {
    this.clearMesh();
    super._destroy();
  }
}
export = TextRenderer;
