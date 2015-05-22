import ui from "./ui";
import { data } from "./network";

import SpriteRenderer from "../../components/SpriteRenderer";
import SelectionRenderer from "./SelectionRenderer";

let spritesheetArea: {
  gameInstance?: SupEngine.GameInstance;
  cameraControls?: any;
  spriteRenderer?: SpriteRenderer;
  gridRenderer?: any;
  selectionRenderer?: any;
} = {};
export default spritesheetArea;

spritesheetArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.spritesheet-canvas"));
spritesheetArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
cameraComponent.setOrthographicMode(true);
cameraComponent.setOrthographicScale(10);

spritesheetArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 60 },
  () => { spritesheetArea.gridRenderer.setOrthgraphicScale(cameraComponent.orthographicScale); }
);

let spriteActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Sprite");
spritesheetArea.spriteRenderer = new SpriteRenderer(spriteActor);

let gridActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Grid");
gridActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 1));
spritesheetArea.gridRenderer = new SupEngine.editorComponentClasses["GridRenderer"](gridActor);

let selectionActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Selection");
selectionActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 2));
spritesheetArea.selectionRenderer = new SelectionRenderer(selectionActor);

export function updateSelection() {
  if (ui.selectedAnimationId == null) return;

  let pub = data.spriteUpdater.spriteAsset.pub;
  let animation = data.spriteUpdater.spriteAsset.animations.byId[ui.selectedAnimationId];
  let width = pub.grid.width / pub.pixelsPerUnit;
  let height = pub.grid.height / pub.pixelsPerUnit;
  let framesPerRow = pub.texture.image.width / pub.grid.width;
  spritesheetArea.selectionRenderer.setup(width, height, animation.startFrameIndex, animation.endFrameIndex, framesPerRow);
}

export function handleSpritesheetArea() {
  spritesheetArea.gameInstance.update();
  spritesheetArea.gameInstance.draw();
}
