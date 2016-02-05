import { data } from "./network";
import ui from "./ui";

import SpriteOriginMarker from "./SpriteOriginMarker";

import * as ResizeHandle from "resize-handle";

let animationArea: {
  gameInstance?: SupEngine.GameInstance;
  cameraControls?: any;
  originMakerComponent?: SpriteOriginMarker;
} = {};
export default animationArea;

new ResizeHandle(document.querySelector(".animation-container") as HTMLDivElement, "bottom");

animationArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector(".animation-container canvas"));
animationArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(animationArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
cameraComponent.setOrthographicMode(true);
cameraComponent.setOrthographicScale(10);
animationArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 0.1, zoomMax: 10000 });

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

export function handleAnimationArea() {
  if (data != null && ui.selectedAnimationId != null) {
    if (!data.spriteUpdater.spriteRenderer.isAnimationPlaying) {
      ui.animationPlay.textContent = "▶";
    } else {
      ui.animationSlider.value = data.spriteUpdater.spriteRenderer.getAnimationFrameIndex().toString();
    }
  }
}
