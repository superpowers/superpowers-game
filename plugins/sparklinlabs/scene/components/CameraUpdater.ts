import CameraMarker from "./CameraMarker";

export default class CameraUpdater {
  camera: CameraMarker
  config: any;

  constructor(client: SupClient.ProjectClient, camera: CameraMarker, config: any) {
    this.camera = camera;
    this.config = config;

    this.camera.setConfig(this.config);
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    this.camera.setConfig(this.config);
  }
}
