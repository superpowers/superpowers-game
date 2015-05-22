import { data } from "./network";
import ui from "./ui";

import SpriteOriginMarker from "./SpriteOriginMarker";

let animationArea: {
  gameInstance?: SupEngine.GameInstance;
  cameraControls?: any;
  originMakerComponent?: SpriteOriginMarker;
} = {};
export default animationArea;

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

export function handleAnimationArea() {
  animationArea.gameInstance.update();
  animationArea.gameInstance.draw();

  if (data != null && ui.selectedAnimationId != null) {
    let animationTime = data.spriteUpdater.spriteRenderer.getAnimationTime() / data.spriteUpdater.spriteRenderer.getAnimationDuration();
    ui.animationSlider.value = (animationTime * 100).toString();
  }
}
