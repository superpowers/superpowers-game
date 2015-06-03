import { data } from "./network";
import ui from "./ui";

import SpriteOriginMarker from "./SpriteOriginMarker";

let PerfectResize = require("perfect-resize");

let animationArea: {
  gameInstance?: SupEngine.GameInstance;
  cameraControls?: any;
  originMakerComponent?: SpriteOriginMarker;
} = {};
export default animationArea;

new PerfectResize(document.querySelector(".animation-container"), "bottom");

animationArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.animation-canvas"));
animationArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(animationArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
cameraComponent.setOrthographicMode(true);
cameraComponent.setOrthographicScale(10);
animationArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 60 });

let originActor = new SupEngine.Actor(animationArea.gameInstance, "Origin");
originActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 1));
animationArea.originMakerComponent = new SpriteOriginMarker(originActor);

export function centerCamera() {
  if (data.spriteUpdater.spriteRenderer.asset == null) return;

  let pub = data.spriteUpdater.spriteAsset.pub;
  let scaleRatio = 1 / cameraComponent.orthographicScale;

  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(
    (0.5 - pub.origin.x) * pub.grid.width * scaleRatio,
    (0.5 - pub.origin.y) * pub.grid.height * scaleRatio, 10
  ));
}

let lastTimestamp = 0;
let accumulatedTime = 0;
export function handleAnimationArea(timestamp: number) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = animationArea.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) animationArea.gameInstance.draw();

  if (data != null && ui.selectedAnimationId != null) {
    let animationTime = data.spriteUpdater.spriteRenderer.getAnimationTime() / data.spriteUpdater.spriteRenderer.getAnimationDuration();
    ui.animationSlider.value = (animationTime * 100).toString();
  }
}
