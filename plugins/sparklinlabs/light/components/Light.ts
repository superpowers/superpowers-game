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

  shadow = {
    mapSize: new THREE.Vector2(512, 512),
    bias: 0,
    // FIXME: Three.js has changed the default to 1.0, should we update?
    darkness: 0.5,
    
    camera: {
      near: 0.1,
      far: 100,
      fov: 50,
      left: -100,
      right: 100,
      top: 100,
      bottom: -100
    }
  };

  constructor(actor: SupEngine.Actor) {
    super(actor, "Light");

    this.actor.gameInstance.threeRenderer.shadowMap.enabled = true;
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
        spotLight.shadow.camera = new THREE.PerspectiveCamera(
          this.shadow.camera.fov,
          this.shadow.mapSize.x / this.shadow.mapSize.y,
          this.shadow.camera.near, this.shadow.camera.far);
        this.light = spotLight;
        this.setCastShadow(this.castShadow);
        break;
      case "directional":
        let directionalLight = new THREE.DirectionalLight(this.color, this.intensity);
        directionalLight.target.position.copy(this.target);
        directionalLight.target.updateMatrixWorld(false);
        directionalLight.shadow.mapSize.copy(this.shadow.mapSize);
        directionalLight.shadow.bias = this.shadow.bias;
        directionalLight.shadow.darkness = this.shadow.darkness;
        directionalLight.shadow.camera = new THREE.OrthographicCamera(
          this.shadow.camera.left, this.shadow.camera.right,
          this.shadow.camera.top, this.shadow.camera.bottom,
          this.shadow.camera.near, this.shadow.camera.far);
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

    this.light.castShadow = this.castShadow;
    this.actor.gameInstance.threeScene.traverse((object: any) => {
      let material: THREE.Material = object.material;
      if (material != null) material.needsUpdate = true;
    });
  }

  setShadowMapSize(width: number, height: number) {
    if (width != null) this.shadow.mapSize.x = width;
    if (height != null) this.shadow.mapSize.y = height;
    if (this.type !== "spot" && this.type !== "directional") return;

    let shadow = (this.light as THREE.SpotLight|THREE.DirectionalLight).shadow;
    shadow.mapSize.copy(this.shadow.mapSize);
    this.setType(this.type);
  }

  setShadowBias(bias: number) {
    this.shadow.bias = bias;
    if (this.type !== "spot" && this.type !== "directional") return;

    let shadow = (this.light as THREE.SpotLight|THREE.DirectionalLight).shadow;
    shadow.bias = this.shadow.bias;
  }

  setShadowDarkness(darkness: number) {
    this.shadow.darkness = darkness;
    if (this.type !== "spot" && this.type !== "directional") return;

    let shadow = (this.light as THREE.SpotLight|THREE.DirectionalLight).shadow;
    shadow.darkness = this.shadow.darkness;
  }

  setShadowCameraNearPlane(near: number) {
    this.shadow.camera.near = near;
    if (this.type !== "spot" && this.type !== "directional") return;

    let shadow = (this.light as THREE.SpotLight|THREE.DirectionalLight).shadow;
    let camera = <THREE.PerspectiveCamera>shadow.camera;
    camera.near = this.shadow.camera.near;
    camera.updateProjectionMatrix();
  }

  setShadowCameraFarPlane(far: number) {
    this.shadow.camera.far = far;
    if (this.type !== "spot" && this.type !== "directional") return;

    let shadow = (this.light as THREE.SpotLight|THREE.DirectionalLight).shadow;
    let camera = <THREE.PerspectiveCamera>shadow.camera;
    camera.far = this.shadow.camera.far;
    camera.updateProjectionMatrix();
  }

  setShadowCameraFov(fov: number) {
    this.shadow.camera.fov;
    if (this.type !== "spot") return;

    let shadow = (this.light as THREE.SpotLight|THREE.DirectionalLight).shadow;
    let camera = <THREE.PerspectiveCamera>shadow.camera;
    camera.fov = this.shadow.camera.fov;
    camera.updateProjectionMatrix();
  }

  setShadowCameraSize(top: number, bottom: number, left: number, right: number) {
    if (top != null) this.shadow.camera.top = top;
    if (bottom != null) this.shadow.camera.bottom = bottom;
    if (left != null) this.shadow.camera.left = left;
    if (right != null) this.shadow.camera.right = right;
    if (this.type !== "directional") return;

    let camera = (<THREE.OrthographicCamera>(<THREE.SpotLight>this.light).shadow.camera);
    camera.top = this.shadow.camera.top;
    camera.bottom = this.shadow.camera.bottom;
    camera.left = this.shadow.camera.left;
    camera.right = this.shadow.camera.right;
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

  setIsLayerActive(active: boolean) { this.light.visible = active; }
}
