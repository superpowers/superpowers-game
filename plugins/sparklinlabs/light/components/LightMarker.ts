let THREE = SupEngine.THREE;
import Light from "./Light"

export default class LightMarker extends Light {
  lightMarker: THREE.PointLightHelper|THREE.SpotLightHelper|THREE.DirectionalLightHelper;
  cameraHelper: THREE.CameraHelper;

  setType(type: string) {
    if (this.lightMarker != null) this.actor.gameInstance.threeScene.remove(this.lightMarker);
    if (this.cameraHelper != null) {
      this.actor.gameInstance.threeScene.remove(this.cameraHelper);
      this.cameraHelper = null;
    }

    super.setType(type);

    switch (type) {
      case "ambient":
        this.lightMarker = null;
        break;
      case "point":
        this.lightMarker = new THREE.PointLightHelper(this.light, 1);
        break;
      case "spot":
        this.lightMarker = new THREE.SpotLightHelper(this.light, 1, 1);
        //if (this.castShadow) this.cameraHelper = new THREE.CameraHelper((<THREE.SpotLight>this.light).shadowCamera);
        break;
      case "directional":
        this.lightMarker = new THREE.DirectionalLightHelper(this.light, 1);
        //if (this.castShadow) this.cameraHelper = new THREE.CameraHelper((<THREE.DirectionalLight>this.light).shadowCamera);
        break;
    }

    if (this.lightMarker != null) {
      this.actor.gameInstance.threeScene.add(this.lightMarker);
      this.lightMarker.updateMatrixWorld(true);
    }
    //if (type === "spot" && this.cameraHelper != null && this.castShadow) this.actor.gameInstance.threeScene.add(this.cameraHelper);
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

  setCastShadow(castShadow: boolean) {
    super.setCastShadow(castShadow);
    if (castShadow) {
      this.cameraHelper = new THREE.CameraHelper((this.light as THREE.DirectionalLight|THREE.SpotLight).shadow.camera);
      this.actor.gameInstance.threeScene.add(this.cameraHelper);
    } else {
      this.actor.gameInstance.threeScene.remove(this.cameraHelper);
      this.cameraHelper = null;
    }
  }

  setShadowCameraNearPlane(near: number) {
    super.setShadowCameraNearPlane(near);
    if (this.cameraHelper != null) this.cameraHelper.update();
  }

  setShadowCameraFarPlane(far: number) {
    super.setShadowCameraFarPlane(far);
    if (this.cameraHelper != null) this.cameraHelper.update();
  }

  setShadowCameraFov(fov: number) {
    super.setShadowCameraFov(fov);
    if (this.cameraHelper != null) this.cameraHelper.update();
  }

  setShadowCameraSize(top: number, bottom: number, left: number, right: number) {
    super.setShadowCameraSize(top, bottom, left, right);
    if (this.cameraHelper != null) this.cameraHelper.update();
  }

  update() {
    // TODO: Only do that when the transform has changed
    if (this.lightMarker != null) {
      this.lightMarker.updateMatrixWorld(true);
      this.lightMarker.update();
    }
    this.actor.gameInstance.threeScene.updateMatrixWorld(false);
  }

  _destroy() {
    if (this.lightMarker != null) this.actor.gameInstance.threeScene.remove(this.lightMarker);
    if (this.cameraHelper != null) this.actor.gameInstance.threeScene.remove(this.cameraHelper);
    super._destroy();
  }
}
