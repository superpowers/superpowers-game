import P2BodyMarker from "./P2BodyMarker";
import { P2BodyConfigPub } from "../componentConfigs/P2BodyConfig";

export default class P2BodyMarkerUpdater {
  bodyRenderer: P2BodyMarker;
  config: P2BodyConfigPub;

  constructor(client: SupClient.ProjectClient, bodyRenderer: P2BodyMarker, config: P2BodyConfigPub) {
    this.bodyRenderer = bodyRenderer;
    this.config = config;

    switch (this.config.shape) {
      case "box": { this.bodyRenderer.setBox(this.config.width, this.config.height); } break;
      case "circle": { this.bodyRenderer.setCircle(this.config.radius); } break;
    }
    this.bodyRenderer.setOffset(this.config.offsetX, this.config.offsetY);
  }

  destroy() { /* Ignore */ }

  config_setProperty(path: string, value: any) {
    if (path === "width" || path === "height" || (path === "shape" && value === "box")) {
      this.bodyRenderer.setBox(this.config.width, this.config.height);
    }

    if (path === "radius" || (path === "shape" && value === "circle")) {
      this.bodyRenderer.setCircle(this.config.radius);
    }

    if (path === "offsetX" || path === "offsetY") {
      this.bodyRenderer.setOffset(this.config.offsetX, this.config.offsetY);
    }
  }
}
