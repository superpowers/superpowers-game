let THREE = SupEngine.THREE;
interface Animation {
  name: string;
  startFrameIndex: number;
  endFrameIndex: number;
}

import SpriteRendererUpdater from "./SpriteRendererUpdater";

export default class SpriteRenderer extends SupEngine.ActorComponent {

  static Updater = SpriteRendererUpdater;

  opacity = 1;
  color = 0xffffff;
  hasFrameBeenUpdated = false;

  asset: any;
  geometry: THREE.PlaneBufferGeometry;
  material: THREE.MeshBasicMaterial|THREE.MeshPhongMaterial;
  materialType = "basic";
  threeMesh: THREE.Mesh;
  castShadow = false;
  receiveShadow = false;

  animationName: string;
  isAnimationPlaying: boolean;
  animationsByName: { [name: string]: Animation };
  animationLooping: boolean;
  animationTimer: number;

  constructor(actor: SupEngine.Actor, spriteAsset?: any, materialType="basic") {
    super(actor, "SpriteRenderer");

    if (spriteAsset != null) this.setSprite(spriteAsset, materialType);
  }

  setSprite(asset: any, materialType?: string) {
    this._clearMesh();

    this.asset = asset;
    if (materialType != null) this.materialType = materialType;
    this.animationName = null;
    this.animationsByName = {};
    if (this.asset == null) return;

    this.updateAnimationsByName();

    this.geometry = new THREE.PlaneBufferGeometry(this.asset.grid.width, this.asset.grid.height);

    if (this.materialType === "basic") this.material = new THREE.MeshBasicMaterial();
    else if (this.materialType === "phong") this.material = new THREE.MeshPhongMaterial();
    this.material.map = this.asset.texture;
    this.material.alphaTest = this.asset.alphaTest;
    this.material.side = THREE.DoubleSide;
    this.material.transparent = true,
    this.material.opacity = this.opacity;
    this.material.color.setHex(this.color);

    this.threeMesh = new THREE.Mesh(this.geometry, this.material);
    this.setCastShadow(this.castShadow);
    this.threeMesh.receiveShadow = this.receiveShadow;

    let scaleRatio = 1 / this.asset.pixelsPerUnit;
    this.threeMesh.scale.set(scaleRatio, scaleRatio, scaleRatio);
    this.threeMesh.position.setX((0.5 - this.asset.origin.x) * this.asset.grid.width * scaleRatio);
    this.threeMesh.position.setY((0.5 - this.asset.origin.y) * this.asset.grid.height * scaleRatio);

    this.setFrame(0);
    this.actor.threeObject.add(this.threeMesh);
    this.threeMesh.updateMatrixWorld(false);
  }

  updateAnimationsByName() {
    this.animationsByName = {};
    for(let animation of this.asset.animations) {
      this.animationsByName[animation.name] = animation;
    }
  }

  _clearMesh() {
    if (this.threeMesh == null) return;
    this.actor.threeObject.remove(this.threeMesh);
    this.threeMesh.geometry.dispose();
    this.threeMesh.material.dispose();
    this.threeMesh = null;
  }

  setCastShadow(castShadow: boolean) {
    this.castShadow = castShadow;
    this.threeMesh.castShadow = castShadow;
    if (! castShadow) return;

    this.actor.gameInstance.threeScene.traverse((object: any) => {
      let material: THREE.Material = object.material;
      if (material != null) material.needsUpdate = true;
    })
  }

  _destroy() {
    this._clearMesh();
    this.asset = null;
    super._destroy();
  }

  setFrame(frame: number) {
    let framesPerRow = Math.floor(this.material.map.image.width / this.asset.grid.width);
    let frameX = frame % framesPerRow
    let frameY = Math.floor(frame / framesPerRow)

    let left   = (frameX     * this.asset.grid.width) / this.material.map.image.width;
    let right  = ((frameX+1) * this.asset.grid.width) / this.material.map.image.width;
    let bottom = (this.material.map.image.height - (frameY+1) * this.asset.grid.height) / this.material.map.image.height;
    let top    = (this.material.map.image.height - frameY     * this.asset.grid.height) / this.material.map.image.height;

    let uvs = this.geometry.getAttribute("uv");
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
      let animation = this.animationsByName[this.animationName];
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

    let animation = this.animationsByName[this.animationName]
    let frame = animation.startFrameIndex + Math.max(1, Math.ceil(this.animationTimer / SupEngine.GameInstance.framesPerSecond * this.asset.framesPerSecond)) - 1
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
