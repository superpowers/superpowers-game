import ArcadeBody2DMarker from "./ArcadeBody2DMarker";

export default class ArcadeBody2DUpdater {
  bodyRenderer: ArcadeBody2DMarker;
  config: { width: number; height: number; offsetX: number; offsetY: number };

  constructor(client: any, bodyRenderer: ArcadeBody2DMarker, config: {width: number; height: number; offsetX: number; offsetY: number}) {
    this.bodyRenderer = bodyRenderer;
    this.config = config;
    this.bodyRenderer.setSize(this.config.width, this.config.height);
    this.bodyRenderer.setOffset(this.config.offsetX, this.config.offsetY);
  }

  config_setProperty(path: string, value: any) {
    (<any>this.config)[path] = value;

    if (path == "width"   || path == "height")   this.bodyRenderer.setSize(this.config.width, this.config.height);
    if (path == "offsetX" || path ==  "offsetY") this.bodyRenderer.setOffset(this.config.offsetX, this.config.offsetY);
  }
}
