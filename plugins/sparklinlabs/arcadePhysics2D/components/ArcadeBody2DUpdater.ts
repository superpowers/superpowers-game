import ArcadeBody2DMarker from "./ArcadeBody2DMarker";
import { ConfigPub } from "../data/ArcadeBody2DConfig";

export default class ArcadeBody2DUpdater {
  projectClient: SupClient.ProjectClient

  bodyRenderer: ArcadeBody2DMarker;
  config: ConfigPub;

  resource: any;

  constructor(projectClient: SupClient.ProjectClient, bodyRenderer: ArcadeBody2DMarker, config: ConfigPub) {
    this.projectClient = projectClient;
    this.bodyRenderer = bodyRenderer;
    this.config = config;

    this.projectClient.subResource("arcadePhysics2DSettings", this);
  }

  destroy() {
    if (this.resource != null) this.projectClient.unsubResource("arcadePhysics2DSettings", this);
  }

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

  onResourceReceived = (resourceId: string, resource: any) => {
    this.resource = resource;
    this.bodyRenderer.plane = this.resource.pub.plane;
    this.setType();
  }

  onResourceEdited = (resourceId: string, command: string, propertyName: string) => {
    this.bodyRenderer.plane = this.resource.pub.plane;
    this.setType();
  }
}
