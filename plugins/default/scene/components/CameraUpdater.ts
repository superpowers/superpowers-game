import CameraMarker from "./CameraMarker";
import { CameraConfigPub } from "../componentConfigs/CameraConfig";

export default class CameraUpdater {
  client: SupClient.ProjectClient;

  camera: CameraMarker;
  config: any;

  resource: any;

  constructor(client: SupClient.ProjectClient, camera: CameraMarker, config: CameraConfigPub) {
    this.client = client;
    this.camera = camera;
    this.config = config;

    this.camera.setConfig(this.config);
    this.camera.setRatio(5 / 3);

    this.client.subResource("gameSettings", this);
  }

  destroy() {
    if (this.resource != null) this.client.unsubResource("gameSettings", this);
  }

  config_setProperty(path: string, value: any) {
    this.camera.setConfig(this.config);
  }

  updateRatio() {
    if (this.resource.pub.ratioNumerator != null && this.resource.pub.ratioDenominator != null)
      this.camera.setRatio(this.resource.pub.ratioNumerator / this.resource.pub.ratioDenominator);
    else this.camera.setRatio(5 / 3);
  }

  onResourceReceived = (resourceId: string, resource: any) => {
    this.resource = resource;
    this.updateRatio();
  };

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.updateRatio();
  };
}
