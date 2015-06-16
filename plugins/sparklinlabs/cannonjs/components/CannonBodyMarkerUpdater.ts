import CannonBodyMarker from "./CannonBodyMarker";

export default class CannonBodyMarkerUpdater {
  client:SupClient.ProjectClient;
  bodyRenderer:CannonBodyMarker;
  config:any;

  constructor(client: SupClient.ProjectClient, bodyRenderer: CannonBodyMarker, config: any) {
    this.client = client;
    this.bodyRenderer = bodyRenderer;
    this.config = config;

    switch (this.config.shape) {
      case "box" :
        this.bodyRenderer.setBox({
          halfWidth: this.config.halfWidth,
          halfHeight: this.config.halfHeight,
          halfDepth: this.config.halfDepth
        });
        break;
      case "sphere" :
        this.bodyRenderer.setSphere(this.config.radius);
        break;
      case"cylinder":
        this.bodyRenderer.setCylinder(this.config.radius, this.config.height);
        break
    }
    this.bodyRenderer.setOffset({ x: this.config.offsetX, y: this.config.offsetY, z: this.config.offsetZ });
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    this.config[path] = value;

    if (["halfWidth", "halfHeight", "halfDepth"].indexOf(path) !== -1 || (path === "shape" && value === "box")) {
      this.bodyRenderer.setBox({
        halfWidth: this.config.halfWidth,
        halfHeight: this.config.halfHeight,
        halfDepth: this.config.halfDepth
      });
      this.bodyRenderer.setOffset({x: this.config.offsetX, y: this.config.offsetY, z: this.config.offsetZ});
    }

    if (["offsetX", "offsetY", "offsetZ"].indexOf(path) !== -1)
      this.bodyRenderer.setOffset({x: this.config.offsetX, y: this.config.offsetY, z: this.config.offsetZ});

    if ((path === "radius" && this.config.shape === "cylinder") || (path === "shape" && value === "cylinder") || path === "height") {
      this.bodyRenderer.setCylinder(this.config.radius, this.config.height);
      this.bodyRenderer.setOffset({x: this.config.offsetX, y: this.config.offsetY, z: this.config.offsetZ});
    }

    if ((path === "radius" && this.config.shape === "sphere") || (path === "shape" && value === "sphere")) {
      this.bodyRenderer.setSphere(this.config.radius);
      this.bodyRenderer.setOffset({x: this.config.offsetX, y: this.config.offsetY, z: this.config.offsetZ});
    }
  }
}
