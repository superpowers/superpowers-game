var THREE = SupEngine.THREE;
interface Animation {
  name: string;
  startFrameIndex: number;
  endFrameIndex: number;
}

class SpriteRenderer extends SupEngine.ActorComponent {

  static Updater = require("./SpriteRendererUpdater");

  opacity = 1;
  color = { r: 1, g: 1, b: 1 };
  hasFrameBeenUpdated = false;

  asset: any;
  geometry: THREE.PlaneBufferGeometry;
  material: THREE.MeshBasicMaterial;
  threeMesh: THREE.Mesh;

  animationName: string;
  isAnimationPlaying: boolean;
  animationsByName: {[name: string]: Animation};
  animationLooping: boolean;
  animationTimer: number;

  constructor(actor: SupEngine.Actor, spriteAsset?: any) {
    super(actor, "SpriteRenderer");

    if (spriteAsset != null) this.setSprite(spriteAsset);
  }

  setSprite(asset: any) {
    this._clearMesh();

    this.asset = asset;
    this.animationName = null;
    this.animationsByName = {};
    if (this.asset == null) return;

    this.updateAnimationsByName();

    this.geometry = new THREE.PlaneBufferGeometry(this.asset.grid.width, this.asset.grid.height);
    this.material = new THREE.MeshBasicMaterial({
      map: this.asset.texture,
      alphaTest: this.asset.alphaTest,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: this.opacity
    });
    this.material.color.setRGB(this.color.r, this.color.g, this.color.b);
    this.threeMesh = new THREE.Mesh(this.geometry, this.material);

    var scaleRatio = 1 / this.asset.pixelsPerUnit;
    this.threeMesh.scale.set(scaleRatio, scaleRatio, scaleRatio);
    this.threeMesh.position.setX((0.5 - this.asset.origin.x) * this.asset.grid.width * scaleRatio);
    this.threeMesh.position.setY((0.5 - this.asset.origin.y) * this.asset.grid.height * scaleRatio);

    this.setFrame(0);
    this.actor.threeObject.add(this.threeMesh);
    this.threeMesh.updateMatrixWorld(false);
  }

  updateAnimationsByName() {
    this.animationsByName = {};
    this.asset.animations.forEach((animation: Animation) => {
      this.animationsByName[animation.name] = animation;
    });
  }

  _clearMesh() {
    if (this.threeMesh == null) return;
    this.actor.threeObject.remove(this.threeMesh);
    this.geometry.dispose();
    this.material.dispose();
    this.threeMesh = null;
  }

  _destroy() {
    this._clearMesh();
    this.asset = null;
    super._destroy();
  }

  setFrame(frame: number) {
    var framesPerRow = Math.floor(this.material.map.image.width / this.asset.grid.width);
    var frameX = frame % framesPerRow
    var frameY = Math.floor(frame / framesPerRow)

    var left   = (frameX     * this.asset.grid.width) / this.material.map.image.width
    var right  = ((frameX+1) * this.asset.grid.width) / this.material.map.image.width
    var bottom = (this.material.map.image.height - (frameY+1) * this.asset.grid.height) / this.material.map.image.height
    var top    = (this.material.map.image.height - frameY     * this.asset.grid.height) / this.material.map.image.height

    var uvs = this.geometry.getAttribute("uv")
    uvs.needsUpdate = true;

    uvs.array[0] = left ; uvs.array[1] = top;
    uvs.array[2] = right; uvs.array[3] = top;
    uvs.array[4] = left ; uvs.array[5] = bottom;
    uvs.array[6] = right; uvs.array[7] = bottom;
  }

  setAnimation(newAnimationName: string, newAnimationLooping=true) {
    if (newAnimationName != null) {
      if (this.animationsByName[newAnimationName] == null) throw new Error(`Animation ${newAnimationName} doesn't exist`);

      this.animationLooping = newAnimationLooping;
      if (newAnimationName === this.animationName && this.isAnimationPlaying ) return;

      this.animationName = newAnimationName;
      this.animationTimer = 0;
      this.isAnimationPlaying = true;
      this.updateFrame();
    }
    else {
      this.animationName = null;
      this.setFrame(0);
    }
  }

  getAnimation() { return this.animationName; }

  setAnimationTime(time: any) {
    if (typeof time !== "number") throw new Error("Time must be an integer");
    if (time < 0 || time > this.getAnimationDuration()) throw new Error(`Time must be between 0 and ${this.getAnimationDuration()}`);
    this.animationTimer = time * SupEngine.GameInstance.framesPerSecond;
    this.updateFrame();
  }

  getAnimationTime() { return (this.animationName != null) ? this.animationTimer / SupEngine.GameInstance.framesPerSecond : 0; }

  getAnimationDuration() {
    if (this.animationName != null) {
      var animation = this.animationsByName[this.animationName];
      return (animation.endFrameIndex - animation.startFrameIndex + 1) / this.asset.framesPerSecond;
    }
    return 0;
  }

  playAnimation(animationLooping=true) {
    this.animationLooping = animationLooping;
    this.isAnimationPlaying = true;
  }
  pauseAnimation() { this.isAnimationPlaying = false; }

  stopAnimation() {
    if (this.animationName == null) return;

    this.isAnimationPlaying = false;
    this.animationTimer = 0;
    this.updateFrame();
  }

  updateFrame() {
    this.hasFrameBeenUpdated = true

    var animation = this.animationsByName[this.animationName]
    var frame = animation.startFrameIndex + Math.max(1, Math.ceil(this.animationTimer / SupEngine.GameInstance.framesPerSecond * this.asset.framesPerSecond)) - 1
    if (frame > animation.endFrameIndex) {
      if (this.animationLooping) {
        frame = animation.startFrameIndex
        this.animationTimer = 1
      }
      else {
        frame = animation.endFrameIndex
        this.isAnimationPlaying = false
      }
    }

    this.setFrame(frame);
  }

  update() {
    if (this.hasFrameBeenUpdated) {
      this.hasFrameBeenUpdated = false;
      return;
    }

    this._tickAnimation()
    this.hasFrameBeenUpdated = false
  }

  _tickAnimation() {
    if (this.animationName == null || ! this.isAnimationPlaying) return;

    this.animationTimer += 1;
    this.updateFrame();
  }
}
export = SpriteRenderer;
