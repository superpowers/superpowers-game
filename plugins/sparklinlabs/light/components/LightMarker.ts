let THREE = SupEngine.THREE;
import Light from "./Light"

export default class LightMarker extends Light {
  lightMarker: THREE.PointLightHelper|THREE.SpotLightHelper|THREE.DirectionalLightHelper;

  setType(type: string) {
    super.setType(type);

    if (this.lightMarker != null) this.actor.gameInstance.threeScene.remove(this.lightMarker);

    switch (type) {
      case "ambient":
        this.lightMarker = null;
        break;
      case "point":
        this.lightMarker = new THREE.PointLightHelper(this.light, 1);
        break;
      case "spot":
        this.lightMarker = new THREE.SpotLightHelper(this.light, 1, 1);
        break;
      case "directional":
        this.lightMarker = new THREE.DirectionalLightHelper(this.light, 1);
        break;
    }

    if (this.lightMarker != null) {
      this.actor.gameInstance.threeScene.add(this.lightMarker);
      this.lightMarker.updateMatrixWorld(true);
    }
  }

  setColor(color: number) {
    super.setColor(color);
    if (this.lightMarker != null) this.lightMarker.update();
  }

  setIntensity(intensity: number) {
    super.setIntensity(intensity);
    if (this.lightMarker != null) this.lightMarker.update();
  }

  setDistance(distance: number) {
    super.setDistance(distance);
    if (this.lightMarker != null) this.lightMarker.update();
  }

  setAngle(angle: number) {
    super.setAngle(angle);
    if (this.lightMarker != null) this.lightMarker.update();
  }

  setTarget(x: number, y: number, z: number) {
    super.setTarget(x, y, z);
    if (this.lightMarker != null) this.lightMarker.update();
  }

  update() {
    // TODO: Only do that when the transform has changed
    if (this.lightMarker != null) {
      this.lightMarker.updateMatrixWorld(true);
      this.lightMarker.update();
    }
  }

  _destroy() {
    if (this.lightMarker != null) this.actor.gameInstance.threeScene.remove(this.lightMarker);
    super._destroy();
  }
}
