let THREE = SupEngine.THREE;

import { SpriteAnimationPub } from "../data/SpriteAnimations";
import SpriteRendererUpdater from "./SpriteRendererUpdater";

export default class SpriteRenderer extends SupEngine.ActorComponent {

  static Updater = SpriteRendererUpdater;

  opacity: number;
  color = { r: 1, g: 1, b: 1 };
  hasFrameBeenUpdated = false;

  asset: any;
  geometry: THREE.PlaneBufferGeometry;
  material: THREE.MeshBasicMaterial|THREE.MeshPhongMaterial|THREE.ShaderMaterial;
  materialType = "basic";
  threeMesh: THREE.Mesh;
  horizontalFlip = false;
  verticalFlip = false;
  castShadow = false;
  receiveShadow = false;

  animationsByName: { [name: string]: SpriteAnimationPub };
  animation: SpriteAnimationPub;
  animationName: string;
  isAnimationPlaying: boolean;
  animationLooping: boolean;
  animationTimer: number;
  playbackSpeed = 1;

  constructor(actor: SupEngine.Actor) {
    super(actor, "SpriteRenderer");
  }

  setSprite(asset: any, materialType?: string, customShader?: any) {
    this._clearMesh();

    this.asset = asset;
    if (materialType != null) this.materialType = materialType;
    this.animationName = null;
    this.animationsByName = {};
    if (this.asset == null || this.asset.textures[this.asset.mapSlots["map"]] == null) return;

    this.updateAnimationsByName();

    this.geometry = new THREE.PlaneBufferGeometry(this.asset.grid.width, this.asset.grid.height);

    if (this.materialType === "shader") {
      this.material = SupEngine.componentClasses["Shader"].createShaderMaterial(
        customShader,
        this.asset.textures,
        this.geometry
      );
      (<any>this.material).map = this.asset.textures[this.asset.mapSlots["map"]];

    } else {
      let material: THREE.MeshBasicMaterial|THREE.MeshPhongMaterial
      if (this.materialType === "basic") material = new THREE.MeshBasicMaterial();
      else if (this.materialType === "phong") {
        material = new THREE.MeshPhongMaterial();
        (<THREE.MeshPhongMaterial>material).lightMap = this.asset.textures[this.asset.mapSlots["light"]];
      }

      material.map = this.asset.textures[this.asset.mapSlots["map"]];
      material.specularMap = this.asset.textures[this.asset.mapSlots["specular"]];
      material.alphaMap = this.asset.textures[this.asset.mapSlots["alpha"]];
      if (this.materialType === "phong") (<THREE.MeshPhongMaterial>material).normalMap = this.asset.textures[this.asset.mapSlots["normal"]];
      material.alphaTest = this.asset.alphaTest;
      material.color.setRGB(this.color.r, this.color.g, this.color.b);
      this.material = material;
      this.setOpacity(this.opacity);
    }
    this.material.side = THREE.DoubleSide;

    this.threeMesh = new THREE.Mesh(this.geometry, this.material);
    this.setCastShadow(this.castShadow);
    this.threeMesh.receiveShadow = this.receiveShadow;

    this.setFrame(0);
    this.actor.threeObject.add(this.threeMesh);
    this.updateShape();
  }

  updateShape() {
    if (this.threeMesh == null) return;

    let scaleRatio = 1 / this.asset.pixelsPerUnit;
    this.threeMesh.scale.set(scaleRatio, scaleRatio, scaleRatio);
    let x: number;
    if (this.horizontalFlip) x = this.asset.origin.x - 0.5;
    else x = 0.5 - this.asset.origin.x;
    let y: number;
    if (this.verticalFlip) y = this.asset.origin.y - 0.5;
    else y = 0.5 - this.asset.origin.y;
    this.threeMesh.position.setX(x * this.asset.grid.width * scaleRatio);
    this.threeMesh.position.setY(y * this.asset.grid.height * scaleRatio);
    this.threeMesh.updateMatrixWorld(false);
  }

  setOpacity(opacity: number) {
    this.opacity = opacity;
    if (this.material == null) return;

    if (this.opacity != null) {
      this.material.transparent = true;
      this.material.opacity = this.opacity;
    } else {
      this.material.transparent = false;
      this.material.opacity = 1;
    }
    this.material.needsUpdate = true;
  }

  setHorizontalFlip(horizontalFlip: boolean) {
    this.horizontalFlip = horizontalFlip;
    if (this.asset == null) return;

    this.updateShape();
    if (this.animationName == null) this.setFrame(0);
    else this.updateFrame(false);
  }

  setVerticalFlip(verticalFlip: boolean) {
    this.verticalFlip = verticalFlip;
    if (this.asset == null) return;

    this.updateShape();
    if (this.animationName == null) this.setFrame(0);
    else this.updateFrame(false);
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
    this.material = null;
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
    let map: THREE.Texture = (<any>this.material).map;

    let frameX: number, frameY: number;
    if (this.asset.frameOrder === "rows") {
      let framesPerRow = Math.floor(map.image.width / this.asset.grid.width);
      frameX = frame % framesPerRow;
      frameY = Math.floor(frame / framesPerRow);
    } else {
      let framesPerColumn = Math.floor(map.image.height / this.asset.grid.height);
      frameX = Math.floor(frame / framesPerColumn);
      frameY = frame % framesPerColumn;
    }

    let left   = (frameX     * this.asset.grid.width) / map.image.width;
    let right  = ((frameX+1) * this.asset.grid.width) / map.image.width;
    let bottom = (map.image.height - (frameY+1) * this.asset.grid.height) / map.image.height;
    let top    = (map.image.height - frameY     * this.asset.grid.height) / map.image.height;

    let tmp: number;
    if (this.horizontalFlip) {
      tmp = left;
      left = right;
      right = tmp;
    }

    if (this.verticalFlip) {
      tmp = top;
      top = bottom;
      bottom = tmp;
    }

    let uvs = this.geometry.getAttribute("uv");
    uvs.needsUpdate = true;

    uvs.array[0] = left ; uvs.array[1] = top;
    uvs.array[2] = right; uvs.array[3] = top;
    uvs.array[4] = left ; uvs.array[5] = bottom;
    uvs.array[6] = right; uvs.array[7] = bottom;
  }

  setAnimation(newAnimationName: string, newAnimationLooping=true) {
    if (newAnimationName != null) {
      let animation = this.animationsByName[newAnimationName];
      if (animation == null) throw new Error(`Animation ${newAnimationName} doesn't exist`);

      this.animationLooping = newAnimationLooping;
      if (newAnimationName === this.animationName && this.isAnimationPlaying ) return;

      this.animation = animation;
      this.animationName = newAnimationName;
      this.animationTimer = 0;
      this.isAnimationPlaying = true;
      this.updateFrame();
    }
    else {
      this.animation = null;
      this.animationName = null;
      this.setFrame(0);
    }
  }

  getAnimation() { return this.animationName; }

  setAnimationFrameTime(frameTime: number) {
    if (this.animationName == null) return;
    if (frameTime < 0 || frameTime > this.getAnimationFrameCount()) throw new Error(`Frame time must be >= 0 and < ${this.getAnimationFrameCount()}`);

    this.animationTimer = Math.ceil(frameTime * this.actor.gameInstance.framesPerSecond / this.asset.framesPerSecond);
    this.updateFrame();
  }

  getAnimationFrameTime() {
    if (this.animationName == null) return 0;
    return this.computeAbsoluteFrameTime() - this.animation.startFrameIndex;
  }

  getAnimationFrameIndex() {
    if (this.animationName == null) return 0;
    return this.computeAbsoluteFrameIndex() - this.animation.startFrameIndex;
  }

  getAnimationFrameCount() {
    if (this.animationName == null) return 0;
    return this.animation.endFrameIndex - this.animation.startFrameIndex + 1;
  }

  playAnimation(animationLooping=true) {
    this.animationLooping = animationLooping;
    this.isAnimationPlaying = true;

    if (!this.animationLooping && this.getAnimationFrameIndex() === this.getAnimationFrameCount() - 1) this.animationTimer = 0;
  }
  pauseAnimation() { this.isAnimationPlaying = false; }

  stopAnimation() {
    if (this.animationName == null) return;

    this.isAnimationPlaying = false;
    this.animationTimer = 0;
    this.updateFrame();
  }

  computeAbsoluteFrameTime() {
    let frame: number;
    if (this.playbackSpeed * this.animation.speed >= 0) {
      frame = this.animation.startFrameIndex;
      frame += this.animationTimer * this.playbackSpeed * this.animation.speed / this.actor.gameInstance.framesPerSecond * this.asset.framesPerSecond;
    } else {
      frame = this.animation.endFrameIndex;
      frame -= this.animationTimer * Math.abs(this.playbackSpeed * this.animation.speed) / this.actor.gameInstance.framesPerSecond * this.asset.framesPerSecond;
    }
    return frame;
  }

  computeAbsoluteFrameIndex() {
    let frame: number;
    if (this.playbackSpeed * this.animation.speed >= 0) {
      frame = this.animation.startFrameIndex;
      frame += Math.floor(this.animationTimer * this.playbackSpeed * this.animation.speed / this.actor.gameInstance.framesPerSecond * this.asset.framesPerSecond);
    } else {
      frame = this.animation.endFrameIndex;
      frame -= Math.floor(this.animationTimer * Math.abs(this.playbackSpeed * this.animation.speed) / this.actor.gameInstance.framesPerSecond * this.asset.framesPerSecond);
    }
    return frame;
  }

  updateFrame(flagFrameUpdated=true) {
    if (flagFrameUpdated) this.hasFrameBeenUpdated = true;

    let frame = this.computeAbsoluteFrameIndex();
    if (frame > this.animation.endFrameIndex) {
      if (this.animationLooping) {
        frame = this.animation.startFrameIndex;
        this.animationTimer = 1;
      }
      else {
        frame = this.animation.endFrameIndex;
        this.animationTimer -= 1;
        this.isAnimationPlaying = false;
      }

    } else if (frame < this.animation.startFrameIndex) {
      if (this.animationLooping) {
        frame = this.animation.endFrameIndex;
        this.animationTimer = 1;
      }
      else {
        frame = this.animation.startFrameIndex;
        this.animationTimer -= 1;
        this.isAnimationPlaying = false;
      }
    }
    this.setFrame(frame);
  }

  update() {
    if (this.material != null) {
      let uniforms = (<THREE.ShaderMaterial>this.material).uniforms;
      if (uniforms != null) uniforms.time.value += 1 / this.actor.gameInstance.framesPerSecond;
    }

    if (this.hasFrameBeenUpdated) {
      this.hasFrameBeenUpdated = false;
      return;
    }

    this._tickAnimation();
    this.hasFrameBeenUpdated = false;
  }

  _tickAnimation() {
    if (this.animationName == null || ! this.isAnimationPlaying) return;

    this.animationTimer += 1;
    this.updateFrame();
  }

  setIsLayerActive(active: boolean) { if (this.threeMesh != null) this.threeMesh.visible = active; }
}
