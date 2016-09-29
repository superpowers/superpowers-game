import ui from "./ui";
import { data } from "./network";

import SpriteRenderer from "../../components/SpriteRenderer";
import SelectionRenderer from "./SelectionRenderer";

const spritesheetArea: {
  gameInstance?: SupEngine.GameInstance;
  cameraControls?: any;
  spriteRenderer?: SpriteRenderer;
  spritesheet?: any;
  gridRenderer?: any;
  selectionRenderer?: SelectionRenderer;
} = {};
export default spritesheetArea;

spritesheetArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector(".spritesheet-container canvas"));
spritesheetArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

const cameraActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
const cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
cameraComponent.setOrthographicMode(true);
cameraComponent.setOrthographicScale(10);

spritesheetArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 0.1, zoomMax: 10000 },
  () => { spritesheetArea.gridRenderer.setOrthgraphicScale(cameraComponent.orthographicScale); }
);

const spriteActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Sprite");
spritesheetArea.spriteRenderer = new SpriteRenderer(spriteActor);

const gridActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Grid");
gridActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 1));
spritesheetArea.gridRenderer = new SupEngine.editorComponentClasses["GridRenderer"](gridActor);

const selectionActor = new SupEngine.Actor(spritesheetArea.gameInstance, "Selection");
selectionActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 2));
spritesheetArea.selectionRenderer = new SelectionRenderer(selectionActor);

export function centerCamera() {
  if (spritesheetArea.spriteRenderer.asset == null) return;

  const pub = data.spriteUpdater.spriteAsset.pub;
  const scaleRatio = 1 / cameraComponent.orthographicScale;

  cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(
    0.5 * pub.grid.width * scaleRatio,
    -0.5 * pub.grid.height * scaleRatio, 10
  ));
}

export function updateSelection() {
  if (ui.selectedAnimationId == null) return;

  const pub = data.spriteUpdater.spriteAsset.pub;
  const texture = pub.textures[pub.mapSlots["map"]];
  if (texture == null) return;

  const animation = data.spriteUpdater.spriteAsset.animations.byId[ui.selectedAnimationId];
  const width = pub.grid.width / pub.pixelsPerUnit;
  const height = pub.grid.height / pub.pixelsPerUnit;
  let framesPerDirection: number;
  if (pub.frameOrder === "rows") framesPerDirection = texture.size.width / pub.grid.width;
  else framesPerDirection = texture.size.height / pub.grid.height;
  spritesheetArea.selectionRenderer.setup(
    width, height,
    animation.startFrameIndex, animation.endFrameIndex,
    pub.frameOrder, framesPerDirection
  );
}
