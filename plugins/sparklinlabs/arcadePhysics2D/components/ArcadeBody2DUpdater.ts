import ArcadeBody2DMarker from "./ArcadeBody2DMarker";
import { ConfigPub } from "../data/ArcadeBody2DConfig";

export default class ArcadeBody2DUpdater {
  projectClient: SupClient.ProjectClient;

  bodyRenderer: ArcadeBody2DMarker;
  config: ConfigPub;

  resource: any;

  constructor(projectClient: SupClient.ProjectClient, bodyRenderer: ArcadeBody2DMarker, config: ConfigPub) {
    this.projectClient = projectClient;
    this.bodyRenderer = bodyRenderer;
    this.config = config;
    this.setType();
  }

  destroy() { /* Ignore */ }

  config_setProperty(path: string, value: any) {
    if (path === "width" || path === "height") this.bodyRenderer.setBox(this.config.width, this.config.height);
    if (path === "offset.x" || path ===  "offset.y") this.bodyRenderer.setOffset(this.config.offset.x, this.config.offset.y);
    if (path === "type") this.setType();
  }

  setType() {
    if (this.config.type === "box") {
      this.bodyRenderer.setBox(this.config.width, this.config.height);
      this.bodyRenderer.setOffset(this.config.offset.x, this.config.offset.y);
    } else this.bodyRenderer.setTileMap();
  }
}
