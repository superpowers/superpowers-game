let THREE = SupEngine.THREE;
import { LightConfigPub } from "../data/LightConfig";
import LightUpdater from "./LightUpdater";

export default class Light extends SupEngine.ActorComponent {

  static Updater = LightUpdater;

  light: THREE.AmbientLight|THREE.PointLight|THREE.SpotLight|THREE.DirectionalLight;
  type: string;
  color = 0xffffff;
  intensity = 1;
  distance = 0;
  angle = Math.PI / 3;
  target = new THREE.Vector3(0, 0, 0);
  castShadow = false;
  shadowMapWidth = 512;
  shadowMapHeight = 512;
  shadowBias = 0;
  shadowDarkness = 0.5;
  shadowCameraNear = 0.1;
  shadowCameraFar = 100;
  shadowCameraFov = 50;
  shadowCameraLeft = -100;
  shadowCameraRight = 100;
  shadowCameraTop = 100;
  shadowCameraBottom = -100;

  constructor(actor: SupEngine.Actor) {
    super(actor, "Light");

    this.actor.gameInstance.threeRenderer.shadowMapEnabled = true;
    this.actor.gameInstance.threeRenderer.shadowMapType = THREE.BasicShadowMap;
  }

  setType(type: string) {
    if (this.light != null) this.actor.threeObject.remove(this.light);
    this.type = type;

    switch (type) {
      case "ambient":
        this.light = new THREE.AmbientLight(this.color);
        break;
      case "point":
        this.light = new THREE.PointLight(this.color, this.intensity, this.distance);
        break;
      case "spot":
        let spotLight = new THREE.SpotLight(this.color, this.intensity, this.distance, this.angle * Math.PI / 180);
        spotLight.target.position.copy(this.target);
        spotLight.target.updateMatrixWorld(false);
        spotLight.shadowCameraNear = 0.1;
        spotLight.shadowCamera = new THREE.PerspectiveCamera( spotLight.shadowCameraFov, spotLight.shadowMapWidth / spotLight.shadowMapHeight, spotLight.shadowCameraNear, spotLight.shadowCameraFar );
        this.light = spotLight;
        this.setCastShadow(this.castShadow);
        break;
      case "directional":
        let directionalLight = new THREE.DirectionalLight(this.color, this.intensity);
        directionalLight.target.position.copy(this.target);
        directionalLight.target.updateMatrixWorld(false);
        directionalLight.shadowMapWidth = this.shadowMapWidth;
        directionalLight.shadowMapHeight = this.shadowMapHeight;
        directionalLight.shadowBias = this.shadowBias;
        directionalLight.shadowDarkness = this.shadowDarkness;
        directionalLight.shadowCameraNear = this.shadowCameraNear;
        directionalLight.shadowCameraFar = this.shadowCameraFar;
        directionalLight.shadowCameraLeft = this.shadowCameraLeft;
        directionalLight.shadowCameraRight = this.shadowCameraRight;
        directionalLight.shadowCameraTop = this.shadowCameraTop;
        directionalLight.shadowCameraBottom = this.shadowCameraBottom;
        directionalLight.shadowCamera = new THREE.OrthographicCamera( directionalLight.shadowCameraLeft, directionalLight.shadowCameraRight, directionalLight.shadowCameraTop, directionalLight.shadowCameraBottom, directionalLight.shadowCameraNear, directionalLight.shadowCameraFar );
        this.light = directionalLight;
        this.setCastShadow(this.castShadow);
        break;
    }
    this.actor.threeObject.add(this.light);
    this.light.updateMatrixWorld(false);

    this.actor.gameInstance.threeScene.traverse((object: any) => {
      let material: THREE.Material = object.material;
      if (material != null) material.needsUpdate = true;
    })
  }

  setColor(color: number) {
    this.color = color;
    this.light.color.setHex(this.color);
  }

  setIntensity(intensity: number) {
    this.intensity = intensity;
    if (this.type !== "ambient") (<THREE.PointLight>this.light).intensity = intensity;
  }

  setDistance(distance: number) {
    this.distance = distance;
    if (this.type === "point" || this.type === "spot") (<THREE.PointLight>this.light).distance = distance;
  }

  setAngle(angle: number) {
    this.angle = angle;
    if (this.type === "spot") (<THREE.SpotLight>this.light).angle = this.angle * Math.PI / 180;
  }

  setTarget(x: number, y: number, z: number) {
    if (x != null) this.target.setX(x);
    if (y != null) this.target.setY(y);
    if (z != null) this.target.setZ(z);
    if (this.type === "spot" || this.type === "directional") {
      (<THREE.SpotLight>this.light).target.position.copy(this.target);
      (<THREE.SpotLight>this.light).target.updateMatrixWorld(true);
    }
  }

  setCastShadow(castShadow: boolean) {
    this.castShadow = castShadow;
    if (this.type !== "spot" && this.type !== "directional") return;

    (<THREE.SpotLight>this.light).castShadow = this.castShadow;
    this.actor.gameInstance.threeScene.traverse((object: any) => {
      let material: THREE.Material = object.material;
      if (material != null) material.needsUpdate = true;
    });
  }

  setShadowMapSize(width: number, height: number) {
    if (width != null) this.shadowMapWidth = width;
    if (height != null) this.shadowMapHeight = height;
    if (this.type !== "spot" && this.type !== "directional") return;

    (<THREE.SpotLight>this.light).shadowMapWidth = this.shadowMapWidth;
    (<THREE.SpotLight>this.light).shadowMapHeight = this.shadowMapHeight;
    this.setType(this.type);
  }

  setShadowBias(bias: number) {
    this.shadowBias = bias;
    if (this.type !== "spot" && this.type !== "directional") return;

    (<THREE.SpotLight>this.light).shadowBias = this.shadowBias;
  }

  setShadowDarkness(darkness: number) {
    this.shadowDarkness = darkness;
    if (this.type !== "spot" && this.type !== "directional") return;

    (<THREE.SpotLight>this.light).shadowDarkness = this.shadowDarkness;
  }

  setShadowCameraNearPlane(near: number) {
    this.shadowCameraNear = near;
    if (this.type !== "spot" && this.type !== "directional") return;

    (<THREE.SpotLight>this.light).shadowCameraNear = this.shadowCameraNear;
    let camera = (<THREE.PerspectiveCamera>(<THREE.SpotLight>this.light).shadowCamera);
    camera.near = this.shadowCameraNear;
    camera.updateProjectionMatrix();
  }

  setShadowCameraFarPlane(far: number) {
    this.shadowCameraFar = far;
    if (this.type !== "spot" && this.type !== "directional") return;

    (<THREE.SpotLight>this.light).shadowCameraFar = this.shadowCameraFar;
    let camera = (<THREE.PerspectiveCamera>(<THREE.SpotLight>this.light).shadowCamera);
    camera.far = this.shadowCameraFar;
    camera.updateProjectionMatrix();
  }

  setShadowCameraFov(fov: number) {
    this.shadowCameraFov = fov;
    if (this.type !== "spot") return;

    (<THREE.SpotLight>this.light).shadowCameraFov = this.shadowCameraFov;
    let camera = (<THREE.PerspectiveCamera>(<THREE.SpotLight>this.light).shadowCamera);
    camera.fov = this.shadowCameraFov;
    camera.updateProjectionMatrix();
  }

  setShadowCameraSize(top: number, bottom: number, left: number, right: number) {
    if (top != null) this.shadowCameraTop = top;
    if (bottom != null) this.shadowCameraBottom = bottom;
    if (left != null) this.shadowCameraLeft = left;
    if (right != null) this.shadowCameraRight = right;
    if (this.type !== "directional") return;

    (<THREE.DirectionalLight>this.light).shadowCameraTop = this.shadowCameraTop;
    (<THREE.DirectionalLight>this.light).shadowCameraBottom = this.shadowCameraBottom;
    (<THREE.DirectionalLight>this.light).shadowCameraLeft = this.shadowCameraLeft;
    (<THREE.DirectionalLight>this.light).shadowCameraRight = this.shadowCameraRight;
    let camera = (<THREE.OrthographicCamera>(<THREE.SpotLight>this.light).shadowCamera);
    camera.top = this.shadowCameraTop;
    camera.bottom = this.shadowCameraBottom;
    camera.left = this.shadowCameraLeft;
    camera.right = this.shadowCameraRight;
    camera.updateProjectionMatrix();
  }

  _destroy() {
    this.actor.threeObject.remove(this.light);
    if (this.castShadow) {
      this.actor.gameInstance.threeScene.traverse((object: any) => {
        let material: THREE.Material = object.material;
        if (material != null) material.needsUpdate = true;
      })
    }
    super._destroy();
  }

  setIsActiveLayer(active: boolean) { this.light.visible = active; }
}
