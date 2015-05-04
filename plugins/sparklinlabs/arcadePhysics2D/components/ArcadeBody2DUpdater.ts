import ArcadeBody2DMarker from "./ArcadeBody2DMarker";
import { ConfigPub } from '../data/ArcadeBody2DConfig';

export default class ArcadeBody2DUpdater {
  bodyRenderer: ArcadeBody2DMarker;
  config: ConfigPub;

  constructor(client: any, bodyRenderer: ArcadeBody2DMarker, config: ConfigPub) {
    this.bodyRenderer = bodyRenderer;
    this.config = config;
    this.setType();
  }

  destroy() {}

  config_setProperty(path: string, value: any) {
    (<any>this.config)[path] = value;

    if (path === "width"   || path === "height")   this.bodyRenderer.setBox(this.config.width, this.config.height);
    if (path === "offsetX" || path ===  "offsetY") this.bodyRenderer.setOffset(this.config.offsetX, this.config.offsetY);
    if (path === "type") this.setType();
  }

  setType() {
    if (this.config.type === "box") {
      this.bodyRenderer.setBox(this.config.width, this.config.height);
      this.bodyRenderer.setOffset(this.config.offsetX, this.config.offsetY);
    } else this.bodyRenderer.setTileMap();
  }
}
