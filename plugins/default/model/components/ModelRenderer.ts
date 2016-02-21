let THREE = SupEngine.THREE;
let tmpBoneMatrix = new THREE.Matrix4;
let tmpVec = new THREE.Vector3;
let tmpQuat = new THREE.Quaternion;

import { ModelAssetPub } from "../data/ModelAsset";
import ModelRendererUpdater from "./ModelRendererUpdater";

interface AnimationKeyFrames {
  [boneName: string]: {
    translation: number[];
    rotation: number[];
    scale: number[];
  };
}

interface Animation {
  id?: string;
  name: string;
  duration: number;
  keyFrames: AnimationKeyFrames;
}

function getInterpolationData(keyFrames: any[], time: number) {
  let prevKeyFrame = keyFrames[keyFrames.length - 1];

  // TODO: Use a cache to maintain most recently used key frames for each bone
  // and profit from temporal contiguity
  let nextKeyFrame: any;
  for (let keyFrame of keyFrames) {
    nextKeyFrame = keyFrame;
    if (keyFrame.time > time) break;
    prevKeyFrame = keyFrame;
  }

  if (prevKeyFrame === nextKeyFrame) nextKeyFrame = keyFrames[0];

  let timeSpan = nextKeyFrame.time - prevKeyFrame.time;
  let timeProgress = time - prevKeyFrame.time;
  let t = (timeSpan > 0) ? timeProgress / timeSpan : 0;

  return { prevKeyFrame, nextKeyFrame, t };
}

export default class ModelRenderer extends SupEngine.ActorComponent {
  /* tslint:disable:variable-name */
  static Updater = ModelRendererUpdater;
  /* tslint:enable:variable-name */

  opacity: number;
  color = { r: 1, g: 1, b: 1 };
  hasPoseBeenUpdated = false;

  asset: ModelAssetPub;
  material: THREE.MeshBasicMaterial|THREE.MeshPhongMaterial|THREE.ShaderMaterial;
  threeMesh: THREE.Mesh|THREE.SkinnedMesh;
  materialType = "basic";
  shaderAsset: any;
  castShadow = false;
  receiveShadow = false;

  animation: Animation;
  isAnimationPlaying: boolean;
  animationsByName: { [name: string]: Animation };
  animationLooping: boolean;
  animationTimer: number;

  bonesByName: { [name: string]: THREE.Bone };

  skeletonHelper: THREE.SkeletonHelper;

  constructor(actor: SupEngine.Actor) {
    super(actor, "ModelRenderer");
  }

  _clearMesh() {
    if (this.skeletonHelper != null) {
      this.actor.threeObject.remove(this.skeletonHelper);
      this.skeletonHelper = null;
    }
    this.actor.threeObject.remove(this.threeMesh);
    this.threeMesh.traverse((obj: any) => { if (obj.dispose != null) obj.dispose(); });
    this.threeMesh = null;
    this.material.dispose();
    this.material = null;
  }

  _destroy() {
    if (this.threeMesh != null) this._clearMesh();
    this.asset = null;
    super._destroy();
  }

  setModel(asset: ModelAssetPub, materialType?: string, customShader?: any) {
    if (this.threeMesh != null) this._clearMesh();

    this.asset = asset;
    if (materialType != null) this.materialType = materialType;
    if (customShader != null) this.shaderAsset = customShader;
    this.animation = null;
    this.animationsByName = {};
    if (asset == null || asset.attributes["position"] == null) return;

    this.updateAnimationsByName();

    let geometry = new THREE.BufferGeometry;

    if (this.asset.attributes["position"] != null) {
      let buffer = new Float32Array(this.asset.attributes["position"]);
      geometry.addAttribute("position", new THREE.BufferAttribute(buffer, 3));
    }
    if (this.asset.attributes["index"] != null) {
      let buffer = new Uint16Array(this.asset.attributes["index"]);
      geometry.setIndex(new THREE.BufferAttribute(buffer, 1));
    }
    if (this.asset.attributes["uv"] != null) {
      let buffer = new Float32Array(this.asset.attributes["uv"]);
      geometry.addAttribute("uv", new THREE.BufferAttribute(buffer, 2));
    }
    if (this.asset.attributes["normal"] != null) {
      let buffer = new Float32Array(this.asset.attributes["normal"]);
      geometry.addAttribute("normal", new THREE.BufferAttribute(buffer, 3));
    }
    if (this.asset.attributes["color"] != null) {
      let buffer = new Float32Array(this.asset.attributes["color"]);
      geometry.addAttribute("color", new THREE.BufferAttribute(buffer, 3));
    }
    if (this.asset.attributes["skinIndex"] != null) {
      let buffer = new Float32Array(this.asset.attributes["skinIndex"]);
      geometry.addAttribute("skinIndex", new THREE.BufferAttribute(buffer, 4));
    }
    if (this.asset.attributes["skinWeight"] != null) {
      let buffer = new Float32Array(this.asset.attributes["skinWeight"]);
      geometry.addAttribute("skinWeight", new THREE.BufferAttribute(buffer, 4));
    }

    if (this.materialType === "shader") {
      this.material = SupEngine.componentClasses["Shader"].createShaderMaterial(
        this.shaderAsset,
        this.asset.textures,
        geometry
      );

    } else {
      let material: THREE.MeshBasicMaterial|THREE.MeshPhongMaterial;
      if (this.materialType === "basic") material = new THREE.MeshBasicMaterial();
      else if (this.materialType === "phong") {
        material = new THREE.MeshPhongMaterial();
        (<THREE.MeshPhongMaterial>material).lightMap = this.asset.textures[this.asset.mapSlots["light"]];
      }

      material.map = this.asset.textures[this.asset.mapSlots["map"]];
      material.specularMap = this.asset.textures[this.asset.mapSlots["specular"]];
      material.alphaMap = this.asset.textures[this.asset.mapSlots["alpha"]];
      if (this.materialType === "phong") (<THREE.MeshPhongMaterial>material).normalMap = this.asset.textures[this.asset.mapSlots["normal"]];
      material.alphaTest = 0.1;
      this.material = material;
    }
    this.setColor(this.color.r, this.color.g, this.color.b);
    this.setOpacity(this.opacity);

    if (this.asset.bones != null) {
      this.threeMesh = new THREE.SkinnedMesh(geometry, this.material);

      if (this.asset.upAxisMatrix != null) {
        let upAxisMatrix = new THREE.Matrix4().fromArray(this.asset.upAxisMatrix);
        this.threeMesh.applyMatrix(upAxisMatrix);
      }

      let bones: THREE.Bone[] = [];
      this.bonesByName = {};

      for (let boneInfo of this.asset.bones) {
        let bone = new THREE.Bone(<THREE.SkinnedMesh>this.threeMesh);
        bone.name = boneInfo.name;
        this.bonesByName[bone.name] = bone;
        bone.applyMatrix(tmpBoneMatrix.fromArray(boneInfo.matrix));
        bones.push(bone);
      }

      for (let i = 0; i < this.asset.bones.length; i++) {
        let boneInfo = this.asset.bones[i];
        if (boneInfo.parentIndex != null) bones[boneInfo.parentIndex].add(bones[i]);
        else this.threeMesh.add(bones[i]);
      }

      this.threeMesh.updateMatrixWorld(true);

      let useVertexTexture = false;
      (<THREE.SkinnedMesh>this.threeMesh).bind(new THREE.Skeleton(bones, undefined, useVertexTexture));
      this.material.skinning = true;


    } else this.threeMesh = new THREE.Mesh(geometry, this.material);


    this.setUnitRatio(asset.unitRatio);
    this.setCastShadow(this.castShadow);
    this.threeMesh.receiveShadow = this.receiveShadow;

    this.actor.threeObject.add(this.threeMesh);
    if (geometry.getAttribute("normal") == null) {
      this.threeMesh.geometry.computeVertexNormals();
      this.threeMesh.geometry.computeFaceNormals();
    }
    this.threeMesh.updateMatrixWorld(false);
  }

  setCastShadow(castShadow: boolean) {
    this.castShadow = castShadow;
    this.threeMesh.castShadow = castShadow;
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

  setColor(r: number, g: number, b: number) {
    this.color.r = r;
    this.color.g = g;
    this.color.b = b;
    if (this.material instanceof THREE.ShaderMaterial) {
      let uniforms = (<THREE.ShaderMaterial>this.material).uniforms;
      if (uniforms.color != null) uniforms.color.value.setRGB(r, g, b);
    } else (<THREE.MeshBasicMaterial>this.material).color.setRGB(r, g, b);
   }

   setUnitRatio(unitRatio: number) {
     if (this.threeMesh == null) return;

     let ratio = 1 / unitRatio;
     this.threeMesh.scale.set(ratio, ratio, ratio);
     this.threeMesh.updateMatrixWorld(false);
   }

  setShowSkeleton(show: boolean) {
    if (show === (this.skeletonHelper != null)) return;

    if (show) {
      this.skeletonHelper = new THREE.SkeletonHelper(this.threeMesh);
      if (this.asset.upAxisMatrix != null) {
        let upAxisMatrix = new THREE.Matrix4().fromArray(this.asset.upAxisMatrix);
        this.skeletonHelper.root = this.skeletonHelper;
        this.skeletonHelper.applyMatrix(upAxisMatrix);
        this.skeletonHelper.update();
      }
      (<THREE.LineBasicMaterial>this.skeletonHelper.material).linewidth = 3;
      this.actor.threeObject.add(this.skeletonHelper);
    } else {
      this.actor.threeObject.remove(this.skeletonHelper);
      this.skeletonHelper = null;
    }

    if (this.threeMesh != null) this.threeMesh.updateMatrixWorld(true);
  }

  updateAnimationsByName() {
    for (let animation of this.asset.animations) {
      this.animationsByName[animation.name] = animation;
    }
  }

  setAnimation(newAnimationName: string, newAnimationLooping = true) {
    if (newAnimationName != null) {
      let newAnimation = this.animationsByName[newAnimationName];
      if (newAnimation == null) throw new Error(`Animation ${newAnimationName} doesn't exist`);
      if (newAnimation === this.animation && this.isAnimationPlaying) return;

      this.animation = newAnimation;
      this.animationLooping = newAnimationLooping;
      this.animationTimer = 0;
      this.isAnimationPlaying = true;
    } else {
      this.animation = null;
      this.clearPose();
    }
    return;
  }

  getAnimation(): string { return (this.animation != null) ? this.animation.name : null; }

  setAnimationTime(time: number) {
    if (typeof time !== "number" || time < 0 || time > this.getAnimationDuration()) throw new Error("Invalid time");
    this.animationTimer = time * this.actor.gameInstance.framesPerSecond;
    this.updatePose();
  }

  getAnimationTime() { return (this.animation != null) ? this.animationTimer / this.actor.gameInstance.framesPerSecond : 0; }
  getAnimationDuration() {
    if (this.animation == null || this.animation.duration == null) return 0;
    return this.animation.duration;
  }

  playAnimation(animationLooping = true) {
    this.animationLooping = animationLooping;
    this.isAnimationPlaying = true;
  }
  pauseAnimation() { this.isAnimationPlaying = false; }

  stopAnimation() {
    if (this.animation == null) return;

    this.isAnimationPlaying = false;
    this.animationTimer = 0;
    this.updatePose();
  }

  clearPose() {
    if (this.threeMesh == null) return;

    for (let i = 0; i < (<THREE.SkinnedMesh>this.threeMesh).skeleton.bones.length; i++) {
      let bone = (<THREE.SkinnedMesh>this.threeMesh).skeleton.bones[i];
      bone.matrix.fromArray(this.asset.bones[i].matrix);
      bone.matrix.decompose(bone.position, bone.quaternion, bone.scale);
    }

    this.threeMesh.updateMatrixWorld(false);
    if (this.skeletonHelper != null) this.skeletonHelper.update();
  }

  getBoneTransform(name: string) {
    if (!this.hasPoseBeenUpdated) this._tickAnimation();

    let position = new THREE.Vector3;
    let orientation = new THREE.Quaternion;
    let scale = new THREE.Vector3;

    if (this.bonesByName == null || this.bonesByName[name] == null) return null;

    this.bonesByName[name].matrixWorld.decompose(position, orientation, scale);
    return { position, orientation, scale };
  }

  updatePose() {
    this.hasPoseBeenUpdated = true;

    // TODO: this.asset.speedMultiplier
    let speedMultiplier = 1;
    let time = this.animationTimer * speedMultiplier / this.actor.gameInstance.framesPerSecond;

    if (time > this.animation.duration) {
      if (this.animationLooping) {
        this.animationTimer -= this.animation.duration * this.actor.gameInstance.framesPerSecond / speedMultiplier;
        time -= this.animation.duration;
      } else {
        time = this.animation.duration;
        this.isAnimationPlaying = false;
      }
    }

    for (let i = 0; i < (<THREE.SkinnedMesh>this.threeMesh).skeleton.bones.length; i++) {
      let bone = (<THREE.SkinnedMesh>this.threeMesh).skeleton.bones[i];
      let boneKeyFrames = this.animation.keyFrames[bone.name];
      if (boneKeyFrames == null) continue;

      if (boneKeyFrames.translation != null) {
        let { prevKeyFrame, nextKeyFrame, t } = getInterpolationData(boneKeyFrames.translation, time);
        bone.position.fromArray(prevKeyFrame.value);
        bone.position.lerp(tmpVec.fromArray(nextKeyFrame.value), t);
      }

      if (boneKeyFrames.rotation != null) {
        let { prevKeyFrame, nextKeyFrame, t } = getInterpolationData(boneKeyFrames.rotation, time);
        bone.quaternion.fromArray(prevKeyFrame.value);
        bone.quaternion.slerp(tmpQuat.fromArray(nextKeyFrame.value), t);
      }

      if (boneKeyFrames.scale != null) {
        let { prevKeyFrame, nextKeyFrame, t } = getInterpolationData(boneKeyFrames.scale, time);
        bone.scale.fromArray(prevKeyFrame.value);
        bone.scale.lerp(tmpVec.fromArray(nextKeyFrame.value), t);
      }
    }

    this.threeMesh.updateMatrixWorld(false);
    if (this.skeletonHelper != null) this.skeletonHelper.update();
  }

  update() {
    if (this.material != null) {
      let uniforms = (<THREE.ShaderMaterial>this.material).uniforms;
      if (uniforms != null) uniforms.time.value += 1 / this.actor.gameInstance.framesPerSecond;
    }

    if (this.hasPoseBeenUpdated) {
      this.hasPoseBeenUpdated = false;
      return;
    }

    this._tickAnimation();
    this.hasPoseBeenUpdated = false;
  }

  _tickAnimation() {
    if (this.threeMesh == null || (<THREE.SkinnedMesh>this.threeMesh).skeleton == null) return;
    if (this.animation == null || this.animation.duration === 0 || !this.isAnimationPlaying) return;

    this.animationTimer += 1;
    this.updatePose();
  }

  setIsLayerActive(active: boolean) { if (this.threeMesh != null) this.threeMesh.visible = active; }
}
