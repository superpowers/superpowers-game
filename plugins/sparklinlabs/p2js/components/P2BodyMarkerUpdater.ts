import P2BodyMarker from "./P2BodyMarker";

export default class P2BodyMarkerUpdater {
  bodyRenderer: P2BodyMarker;
  config: any;

  constructor(client: any, bodyRenderer: P2BodyMarker, config: any) {
    this.bodyRenderer = bodyRenderer;
    this.config = config;

    switch (this.config.shape) {
      case "rectangle": { this.bodyRenderer.setRectangle(this.config.width, this.config.height); break; }
      case "circle": { this.bodyRenderer.setCircle(this.config.radius); break; }
    }
    this.bodyRenderer.setOffset(this.config.offsetX, this.config.offsetY);
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    if (path === "width" || path === "height" || (path === "shape" && value === "rectangle")) {
      this.bodyRenderer.setRectangle(this.config.width, this.config.height);
    }

    if (path === "radius" || (path === "shape" && value === "circle")) {
      this.bodyRenderer.setCircle(this.config.radius);
    }

    if (path === "offsetX" || path === "offsetY") {
      this.bodyRenderer.setOffset(this.config.offsetX, this.config.offsetY);
    }
  }
}
