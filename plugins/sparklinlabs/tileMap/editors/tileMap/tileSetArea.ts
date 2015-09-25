import ui, { selectBrush, selectFill } from "./ui";
import { setupPattern } from "./mapArea";
import { data } from "./network";

let tmpVector3 = new SupEngine.THREE.Vector3();

let tileSetArea: {
  gameInstance?: SupEngine.GameInstance;

  cameraComponent?: any;

  selectedLayerId?: string;

  selectionStartPoint?: { x: number; y : number };
  selectionEndPoint?: { x: number; y : number };
} = {};

tileSetArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.tileSet"));
tileSetArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(tileSetArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
tileSetArea.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
tileSetArea.cameraComponent.setOrthographicMode(true);
new SupEngine.editorComponentClasses["Camera2DControls"](
  cameraActor, tileSetArea.cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 60 },
  () => { data.tileSetUpdater.tileSetRenderer.gridRenderer.setOrthgraphicScale(tileSetArea.cameraComponent.orthographicScale); }
);
export default tileSetArea;

function getTileSetGridPosition(gameInstance: SupEngine.GameInstance, cameraComponent: any) {
  let mousePosition = gameInstance.input.mousePosition;
  let position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
  cameraComponent.actor.getLocalPosition(tmpVector3);
  let ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;

  let x = position.x / gameInstance.threeRenderer.domElement.width;
  x = x * 2 - 1;
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
  x += tmpVector3.x;
  x = Math.floor(x);

  let y = position.y / gameInstance.threeRenderer.domElement.height;
  y = y * 2 - 1;
  y *= cameraComponent.orthographicScale / 2;
  y -= tmpVector3.y;
  y *= ratio;
  y = Math.floor(y);

  return [ x, y ];
}

export function handleTileSetArea() {
  if (data.tileMapUpdater == null) return;
  if (data.tileMapUpdater.tileMapAsset == null) return;
  if (data.tileMapUpdater.tileSetAsset == null) return;

  let tilesPerRow = data.tileMapUpdater.tileSetAsset.pub.domImage.width / data.tileMapUpdater.tileSetAsset.pub.grid.width;
  let tilesPerColumn = data.tileMapUpdater.tileSetAsset.pub.domImage.height / data.tileMapUpdater.tileSetAsset.pub.grid.height;

  let [ mouseX, mouseY ] = getTileSetGridPosition(tileSetArea.gameInstance, tileSetArea.cameraComponent);
  if (tileSetArea.gameInstance.input.mouseButtons[0].wasJustPressed) {

    if (mouseX >= 0 && mouseX < tilesPerRow && mouseY >= 0 && mouseY < tilesPerColumn) {
      if (ui.fillToolButton.checked) {
        selectFill(mouseX, mouseY);
      } else {
        tileSetArea.selectionStartPoint = { x: mouseX, y: mouseY };
        selectBrush(mouseX, mouseY);
      }
    }

  } else if (tileSetArea.gameInstance.input.mouseButtons[0].wasJustReleased && tileSetArea.selectionStartPoint != null) {
    // Clamp mouse values
    let x = Math.max(0, Math.min(tilesPerRow - 1, mouseX));
    let y = Math.max(0, Math.min(tilesPerColumn - 1, mouseY));

    let startX = Math.min(tileSetArea.selectionStartPoint.x, x);
    let startY = Math.min(tileSetArea.selectionStartPoint.y, y);
    let width = Math.abs(x - tileSetArea.selectionStartPoint.x) + 1;
    let height = Math.abs(y - tileSetArea.selectionStartPoint.y);
    let layerData: (number|boolean)[][] = [];
    for (let y = height; y >= 0; y--) {
      for (let x = 0; x < width; x++) {
        layerData.push([ startX + x, startY + y, false, false, 0 ]);
      }
    }

    setupPattern(layerData, width);
    selectBrush(startX, startY, width, height + 1);
    tileSetArea.selectionStartPoint = null;
  }

  if (tileSetArea.selectionStartPoint != null) {
    // Clamp mouse values
    let x = Math.max(0, Math.min(tilesPerRow - 1, mouseX));
    let y = Math.max(0, Math.min(tilesPerColumn - 1, mouseY));

    let width = x - tileSetArea.selectionStartPoint.x;
    if (width >= 0) {
      width += 1;
      x = tileSetArea.selectionStartPoint.x;
    } else {
      width -= 1;
      x = tileSetArea.selectionStartPoint.x + 1;
    }

    let height = y - tileSetArea.selectionStartPoint.y;
    if (height >= 0) {
      height += 1;
      y = tileSetArea.selectionStartPoint.y;
    } else {
      height -= 1;
      y = tileSetArea.selectionStartPoint.y + 1;
    }

    data.tileSetUpdater.tileSetRenderer.select(x, y, width, height);
  }
}
