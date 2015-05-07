let THREE = SupEngine.THREE;
import { LightConfigPub } from "../data/LightConfig";
import LightUpdater from "./LightUpdater";

export default class Light extends SupEngine.ActorComponent {

  static Updater = LightUpdater;

  light: THREE.AmbientLight|THREE.PointLight|THREE.SpotLight|THREE.DirectionalLight;
  type: string;
  color = "ffffff";
  intensity = 1;
  distance = 0;
  target = new THREE.Vector3(0, 0, 0);

  constructor(actor: SupEngine.Actor) {
    super(actor, "Light");
  }

  setType(type: string) {
    if (this.light != null) this.actor.threeObject.remove(this.light);
    this.type = type;

    switch (type) {
      case "ambient":
        this.light = new THREE.AmbientLight(parseInt(`0x${this.color}`));
        break;
      case "point":
        this.light = new THREE.PointLight(parseInt(`0x${this.color}`), this.intensity, this.distance);
        break;
      case "spot":
        let spotLight = new THREE.SpotLight(parseInt(`0x${this.color}`), this.intensity, this.distance);
        spotLight.target.position.copy(this.target);
        spotLight.target.updateMatrixWorld(false);
        spotLight.shadowCameraNear = 0.1;
        this.light = spotLight;
        break;
      case "directional":
        let directionalLight = new THREE.DirectionalLight(parseInt(`0x${this.color}`), this.intensity);
        directionalLight.target.position.copy(this.target);
        directionalLight.target.updateMatrixWorld(false);
        this.light = directionalLight;
        break;
    }
    this.actor.threeObject.add(this.light);
    this.light.updateMatrixWorld(true);

    this.actor.gameInstance.threeScene.traverse((object: any) => {
      let material: THREE.Material = object.material;
      if (material != null) material.needsUpdate = true;
    })
  }

  setColor(color: string) {
    this.color = color;
    this.light.color.setHex(parseInt(`0x${this.color}`));
  }

  setIntensity(intensity: number) {
    this.intensity = intensity;
    if (this.type !== "ambient") (<THREE.PointLight>this.light).intensity = intensity;
  }

  setDistance(distance: number) {
    this.distance = distance;
    if (this.type === "point" || this.type === "spot") (<THREE.PointLight>this.light).distance = distance;
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

  _destroy() {
    this.actor.threeObject.remove(this.light);
    super._destroy();
  }
}
