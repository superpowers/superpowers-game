import Light from "./Light";
import { LightConfigPub } from "../data/LightConfig";

export default class LightUpdater {

  light: Light;

  constructor(client: SupClient.ProjectClient, light: Light, config: LightConfigPub) {
    this.light = light;

    this.light.color = parseInt(config.color, 16);
    this.light.intensity = config.intensity;
    this.light.distance = config.distance;
    this.light.angle = config.angle;
    this.light.target.set(config.target.x, config.target.y, config.target.z);
    this.light.castShadow = config.castShadow;
    this.light.shadowMapWidth = config.shadowMapSize.width;
    this.light.shadowMapHeight = config.shadowMapSize.height;
    this.light.shadowBias = config.shadowBias;
    this.light.shadowDarkness = config.shadowDarkness;
    this.light.shadowCameraNear = config.shadowCameraNearPlane;
    this.light.shadowCameraFar = config.shadowCameraFarPlane;
    this.light.shadowCameraFov = config.shadowCameraFov;
    this.light.shadowCameraLeft = config.shadowCameraSize.left;
    this.light.shadowCameraRight = config.shadowCameraSize.right;
    this.light.shadowCameraTop = config.shadowCameraSize.top;
    this.light.shadowCameraBottom = config.shadowCameraSize.bottom;

    this.light.setType(config.type);
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    switch(path) {
      case "type":
        this.light.setType(value);
        break;
      case "color":
        this.light.setColor(parseInt(value, 16));
        break;
      case "intensity":
        this.light.setIntensity(value);
        break;
      case "distance":
        this.light.setDistance(value);
        break;
      case "angle":
        this.light.setAngle(value);
        break;
      case "target.x":
        this.light.setTarget(value, null, null);
        break;
      case "target.y":
        this.light.setTarget(null, value, null);
        break;
      case "target.z":
        this.light.setTarget(null, null, value);
        break;
      case "castShadow":
        this.light.setCastShadow(value);
        break;
      case "shadowMapSize.width":
        this.light.setShadowMapSize(value, null);
        break;
      case "shadowMapSize.height":
        this.light.setShadowMapSize(null, value);
        break;
      case "shadowBias":
        this.light.setShadowBias(value);
        break;
      case "shadowDarkness":
        this.light.setShadowDarkness(value);
        break;
      case "shadowCameraNearPlane":
        this.light.setShadowCameraNearPlane(value);
        break;
      case "shadowCameraFarPlane":
        this.light.setShadowCameraFarPlane(value);
        break;
      case "shadowCameraFov":
        this.light.setShadowCameraFov(value);
        break;
      case "shadowCameraSize.top":
        this.light.setShadowCameraSize(value, null, null, null);
        break;
      case "shadowCameraSize.bottom":
        this.light.setShadowCameraSize(null, value, null, null);
        break;
      case "shadowCameraSize.left":
        this.light.setShadowCameraSize(null, null, value, null);
        break;
      case "shadowCameraSize.right":
        this.light.setShadowCameraSize(null, null, null, value);
        break;
    }
  }
}
