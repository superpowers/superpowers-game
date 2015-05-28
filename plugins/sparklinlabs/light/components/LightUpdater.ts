import Light from "./Light";
import { LightConfigPub } from "../data/LightConfig";

export default class LightUpdater {

  light: Light;

  constructor(client: SupClient.ProjectClient, light: Light, config: LightConfigPub) {
    this.light = light;

    this.light.setType(config.type);
    this.light.setColor(parseInt(config.color, 16));
    this.light.setIntensity(config.intensity);
    this.light.setDistance(config.distance);
    this.light.setAngle(config.angle);
    this.light.setTarget(config.target.x, config.target.y, config.target.z);
    this.light.setCastShadow(config.castShadow);
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
    }
  }
}
