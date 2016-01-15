import ui, { selectBrushTool, selectEraserTool } from "./ui";
import tileSetArea from "./tileSetArea";
import { editAsset, data } from "./network";

import * as _ from "lodash";

import TileMap from "../../components/TileMap";
import TileMapRenderer from "../../components/TileMapRenderer";

let tmpVector3 = new SupEngine.THREE.Vector3();

// Map Area
let mapArea: {
  gameInstance?: SupEngine.GameInstance;

  cameraComponent?: any;
  cameraControls?: any;

  gridActor?: SupEngine.Actor;
  gridRenderer?: any;

  patternData?: ((number|boolean)[]|number)[]
  patternDataWidth?: number;
  patternActor?: SupEngine.Actor;
  patternRenderer?: TileMapRenderer;
  patternBackgroundActor?: SupEngine.Actor;
  patternBackgroundRenderer?: any;

  duplicatingSelection?: boolean;

  cursorPoint?: { x: number; y : number };
  selectionStartPoint?: { x: number; y : number };
  selectionEndPoint?: { x: number; y : number };

  lastTile?: { x: number; y: number; tile: (number|boolean)[]; };
} = {};
export default mapArea;

mapArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.map"));
mapArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(mapArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 100));
mapArea.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
mapArea.cameraComponent.setOrthographicMode(true);
mapArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](
  cameraActor, mapArea.cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 200 },
  () => { mapArea.gridRenderer.setOrthgraphicScale(mapArea.cameraComponent.orthographicScale); }
);

mapArea.gridActor = new SupEngine.Actor(mapArea.gameInstance, "Grid");
mapArea.gridActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 90));
mapArea.gridRenderer = new SupEngine.editorComponentClasses["GridRenderer"](mapArea.gridActor, {
  width: 1, height: 1, ratio: { x: 1, y: 1 },
  orthographicScale: mapArea.cameraComponent.orthographicScale
});

mapArea.patternData = [];
mapArea.patternDataWidth = 1;
mapArea.patternActor = new SupEngine.Actor(mapArea.gameInstance, "Pattern");
mapArea.patternRenderer = new TileMapRenderer(mapArea.patternActor);
mapArea.patternBackgroundActor = new SupEngine.Actor(mapArea.gameInstance, "Pattern Background");
mapArea.patternBackgroundRenderer = new SupEngine.editorComponentClasses["FlatColorRenderer"](mapArea.patternBackgroundActor);

mapArea.duplicatingSelection = false;
mapArea.cursorPoint = { x: -1, y: -1 };

type TileData = ((number|boolean)[]|number);
export function setupPattern(layerData: TileData[], width = 1, startX?: number, startY?: number) {
  mapArea.patternData = layerData;
  mapArea.patternDataWidth = width;

  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let height = layerData.length / width;

  if (startX == null) startX = mapArea.cursorPoint.x;
  if (startY == null) startY = mapArea.cursorPoint.y;

  let patternLayerData: ((number|boolean)[]|number)[] = [];
  for (let y = 0; y < pub.height; y++) {
    for (let x = 0; x < pub.width; x++) {
      let localX = x - startX;
      let localY = y - startY;

      if (localX < 0 || localX >= width || localY < 0 || localY >= height) patternLayerData.push(0);
      else patternLayerData.push(layerData[localY * width + localX]);
    }
  }

  let patternData = {
    tileSetId: null as string,
    width: pub.width, height: pub.height,
    pixelsPerUnit: pub.pixelsPerUnit,
    layerDepthOffset: pub.layerDepthOffset,
    layers: [ { id: "0", name: "pattern", data: patternLayerData } ]
  };

  mapArea.patternRenderer.setTileMap(new TileMap(patternData));
}

export function setupFillPattern(newTileData: TileData) {
  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let layerData = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId].data;

  let patternLayerData: ((number|boolean)[]|number)[] = [];
  for (let y = 0; y < pub.height; y++) {
    for (let x = 0; x < pub.width; x++) {
      patternLayerData.push(0);
    }
  }

  let refTileData = <(number|boolean)[]>layerData[mapArea.cursorPoint.y * pub.width + mapArea.cursorPoint.x];
  function checkTile(x: number, y: number) {
    if (x < 0 || x >= pub.width || y < 0 || y >= pub.height) return;

    let index = y * pub.width + x;
    // Skip if target tile on pattern isn't empty
    let patternTile = patternLayerData[index];
    if (patternTile !== 0) return;

    // Skip if target tile on layer is different from the base tile
    let layerTile = <(number|boolean)[]>layerData[index];
    if ((<any>layerTile) === 0) {
      if ((<any>refTileData) !== 0) return;
    } else {
      for (let i = 0; i < layerTile.length; i++)
        if (layerTile[i] !== refTileData[i]) return;
    }

    patternLayerData[index] = _.cloneDeep(newTileData);

    checkTile(x - 1, y);
    checkTile(x + 1, y);
    checkTile(x    , y - 1);
    checkTile(x    , y + 1);
  }

  if (mapArea.cursorPoint.x >= 0 && mapArea.cursorPoint.x < pub.width && mapArea.cursorPoint.y >= 0 && mapArea.cursorPoint.y < pub.height)
    checkTile(mapArea.cursorPoint.x, mapArea.cursorPoint.y);

  let patternData = {
    tileSetId: <string>null,
    width: pub.width, height: pub.height,
    pixelsPerUnit: pub.pixelsPerUnit,
    layerDepthOffset: pub.layerDepthOffset,
    layers: [ { id: "0", name: "pattern", data: patternLayerData } ]
  };

  mapArea.patternRenderer.setTileMap(new TileMap(patternData));
}

export function flipTilesHorizontally() {
  if (!mapArea.patternActor.threeObject.visible) return;

  let width = mapArea.patternDataWidth;
  let height = mapArea.patternData.length / mapArea.patternDataWidth;
  let layerData: ((number|boolean)[]|number)[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = width - 1; x >= 0; x--) {
      let tileValue = mapArea.patternData[y * width + x];
      if (typeof tileValue === "number") layerData.push(0);
      else {
        tileValue[2] = !tileValue[2];
        if (tileValue[4] === 90) tileValue[4] = 270;
        else if (tileValue[4] === 270) tileValue[4] = 90;
        layerData.push(tileValue);
      }
    }
  }

  setupPattern(layerData, width);
}

export function flipTilesVertically() {
  if (!mapArea.patternActor.threeObject.visible) return;

  let width = mapArea.patternDataWidth;
  let height = mapArea.patternData.length / mapArea.patternDataWidth;
  let layerData: TileData[] = [];
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      let tileValue = mapArea.patternData[y * width + x];
      if (typeof tileValue === "number") layerData.push(0);
      else {
        tileValue[3] = !tileValue[3];
        if (tileValue[4] === 90) tileValue[4] = 270;
        else if (tileValue[4] === 270) tileValue[4] = 90;
        layerData.push(tileValue);
      }
    }
  }

  setupPattern(layerData, width);
}

export function rotateTiles() {
  if (!mapArea.patternActor.threeObject.visible) return;

  let width = mapArea.patternDataWidth;
  let height = mapArea.patternData.length / mapArea.patternDataWidth;
  let layerData: TileData[] = [];
  for (let x = 0; x < width; x++) {
    for (let y = height - 1; y >= 0; y--) {
      let tileValue = mapArea.patternData[y * width + x];
      if (typeof tileValue === "number") layerData.push(0);
      else {
        (<any>tileValue)[4] += 90;
        if (tileValue[4] === 360) tileValue[4] = 0;

        layerData.push(tileValue);
      }
    }
  }

  setupPattern(layerData, height);
  let ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(height, width / ratio, 1));
}

interface Edits {
  x: number;
  y: number;
  tileValue: ((number|boolean)[]|number);
}

function getEditsFromPattern(point: { x: number; y: number }) {
  let edits: Edits[] = [];
  for (let tileIndex = 0; tileIndex < mapArea.patternData.length; tileIndex++) {
    let tileValue = mapArea.patternData[tileIndex];
    let x = point.x + tileIndex % mapArea.patternDataWidth;
    let y = point.y + Math.floor(tileIndex / mapArea.patternDataWidth);

    edits.push({ x, y, tileValue });
  }
  return edits;
}

function editMap(edits: Edits[]) {
  let actualEdits: Edits[] = [];
  let layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];

  for (let edit of edits) {
    if (edit.x >= 0 && edit.x < data.tileMapUpdater.tileMapAsset.pub.width && edit.y >= 0 && edit.y < data.tileMapUpdater.tileMapAsset.pub.height) {

      let index = edit.y * data.tileMapUpdater.tileMapAsset.pub.width + edit.x;

      let sameTile = true;
      if (edit.tileValue === 0) {
        if (layer.data[index] !== 0) sameTile = false;
      } else {
        let tileValue = edit.tileValue as (number|boolean)[];
        for (let i = 0; i < tileValue.length; i++) {
          if ((layer.data[index] as (number|boolean)[])[i] !== tileValue[i]) {
            sameTile = false;
            break;
          }
        }
      }
      if (!sameTile) actualEdits.push(edit);
    }
  }

  if (actualEdits.length === 0) return;
  editAsset("editMap", layer.id, actualEdits);
}

function getMapGridPosition(gameInstance: SupEngine.GameInstance, cameraComponent: any) {
  let mousePosition = gameInstance.input.mousePosition;
  let position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
  cameraComponent.actor.getLocalPosition(tmpVector3);

  let x = position.x / gameInstance.threeRenderer.domElement.width;
  x = x * 2 - 1;
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
  x += tmpVector3.x;
  x *= data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.width;
  x = Math.floor(x);

  let y = position.y / gameInstance.threeRenderer.domElement.height;
  y = y * 2 - 1;
  y *= cameraComponent.orthographicScale / 2;
  y -= tmpVector3.y;
  y *= data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.height;
  y = Math.floor(y);

  return [ x, -y - 1 ];
}

export function handleMapArea() {
  if (data.tileMapUpdater == null || data.tileMapUpdater.tileMapAsset == null ||
  data.tileMapUpdater.tileSetAsset == null || data.tileMapUpdater.tileSetAsset.pub.texture == null) {
    mapArea.patternActor.threeObject.visible = false;
    mapArea.patternBackgroundActor.threeObject.visible = false;
    return;
  }

  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let input = mapArea.gameInstance.input;

  let [ mouseX, mouseY ] = getMapGridPosition(mapArea.gameInstance, mapArea.cameraComponent);
  let cursorHasMoved = false;
  if (mouseX !== mapArea.cursorPoint.x || mouseY !== mapArea.cursorPoint.y) {
    cursorHasMoved = true;

    mapArea.cursorPoint.x = mouseX;
    mapArea.cursorPoint.y = mouseY;

    ui.mousePositionLabel.x.textContent = mouseX.toString();
    ui.mousePositionLabel.y.textContent = mouseY.toString();
  }

  if (ui.brushToolButton.checked) handleBrushMode(cursorHasMoved);
  else if (ui.fillToolButton.checked) handleFillMode(cursorHasMoved);
  else if (ui.selectionToolButton.checked) handleSelectionMode(cursorHasMoved);
  else if (ui.eraserToolButton.checked) handleEraserMode(cursorHasMoved);

  // Quick switch to Brush or Eraser
  if (input.mouseButtons[2].wasJustReleased && (ui.brushToolButton.checked || ui.eraserToolButton.checked))  {
    if (mouseX >= 0 && mouseX < pub.width && mouseY >= 0 && mouseY < pub.height) {
      let layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
      let tile = layer.data[mouseY * pub.width + mouseX];
      if (typeof tile === "number") {
        selectEraserTool();
      } else {
        selectBrushTool(tile[0] as number, tile[1] as number);
        setupPattern([ tile ]);
      }
    }
  }

  // Update pattern background
  if (mapArea.patternActor.threeObject.visible || ui.eraserToolButton.checked) {
    let layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
    let z = (pub.layers.indexOf(layer) + 0.5) * pub.layerDepthOffset;
    let ratioX = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.width;
    let ratioY = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.height;
    let patternPosition = new SupEngine.THREE.Vector3(mouseX / ratioX, mouseY / ratioY, z);
    mapArea.patternBackgroundActor.setLocalPosition(patternPosition);
  }
}

function handleBrushMode(cursorHasMoved: boolean) {
  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let input = mapArea.gameInstance.input;

  let shiftKey = input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_SHIFT];

  if (input.mouseButtons[0].isDown) {
    if (mapArea.lastTile != null && shiftKey.isDown) {
      let xMin = Math.min(mapArea.cursorPoint.x, mapArea.lastTile.x);
      let xOffset = Math.abs(mapArea.cursorPoint.x - mapArea.lastTile.x) + 1;
      let yMin = Math.min(mapArea.cursorPoint.y, mapArea.lastTile.y);
      let yOffset = Math.abs(mapArea.cursorPoint.y - mapArea.lastTile.y) + 1;

      let point = { x: 0, y: 0 };
      if (xOffset > yOffset) {
        point.x = xMin;
        point.y = mapArea.lastTile.y;
      } else {
        point.x = mapArea.lastTile.x;
        point.y = yMin;
      }
      editMap(getEditsFromPattern(point));
      setupPattern([mapArea.patternData[0]], 1);
    } else editMap(getEditsFromPattern(mapArea.cursorPoint));

    let x = mapArea.cursorPoint.x;
    let y = mapArea.cursorPoint.y;
    if (mapArea.patternData.length === 1 && x >= 0 && x < pub.width && y >= 0 && y < pub.height)
      mapArea.lastTile = { x, y, tile: (mapArea.patternData[0] as (number|boolean)[]).slice() };

  } else if (mapArea.lastTile != null && shiftKey.wasJustReleased) {
    setupPattern([mapArea.lastTile.tile]);

  } else if (mapArea.lastTile != null && shiftKey.isDown) {
    let xMin = Math.min(mapArea.cursorPoint.x, mapArea.lastTile.x);
    let xOffset = Math.abs(mapArea.cursorPoint.x - mapArea.lastTile.x) + 1;
    let yMin = Math.min(mapArea.cursorPoint.y, mapArea.lastTile.y);
    let yOffset = Math.abs(mapArea.cursorPoint.y - mapArea.lastTile.y) + 1;

    let patternData: TileData[] = [];
    if (xOffset > yOffset) {
      for (let x = 0; x < xOffset; x++) patternData.push(mapArea.lastTile.tile);
      setupPattern(patternData, xOffset, xMin, mapArea.lastTile.y);
    } else {
      for (let y = 0; y < yOffset; y++) patternData.push(mapArea.lastTile.tile);
      setupPattern(patternData, 1, mapArea.lastTile.x, yMin);
    }
  } else if (cursorHasMoved) setupPattern(mapArea.patternData, mapArea.patternDataWidth);
}

function handleFillMode(cursorHasMoved: boolean) {
  if (cursorHasMoved) {
    data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalPosition(tmpVector3);
    setupFillPattern([ tmpVector3.x, -tmpVector3.y, false, false, 0 ]);
  }

  if (!mapArea.gameInstance.input.mouseButtons[0].wasJustPressed) return;

  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let edits: Edits[] = [];
  for (let y = 0; y < pub.height; y++) {
    for (let x = 0; x < pub.width; x++) {
      let tileValue = mapArea.patternRenderer.tileMap.getTileAt(0, x, y);
      if (tileValue !== 0) edits.push({ x, y, tileValue });
    }
  }
  editMap(edits);
}

function handleSelectionMode(cursorHasMoved: boolean) {
  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let input = mapArea.gameInstance.input;
  let keyEvent = (<any>window).KeyEvent;

  let cancelAction = input.mouseButtons[2].wasJustPressed || input.keyboardButtons[keyEvent.DOM_VK_ESCAPE].wasJustPressed;

  // Moving/duplicating a pattern
  if (mapArea.patternActor.threeObject.visible) {
    if (cursorHasMoved) setupPattern(mapArea.patternData, mapArea.patternDataWidth);
    if (input.mouseButtons[0].wasJustPressed) {
      editMap(getEditsFromPattern(mapArea.cursorPoint));
      if (!mapArea.duplicatingSelection) clearSelection();
    } else if (cancelAction) {
      clearSelection();
    }
    return;
  }

  // Selection with mouse
  if (cancelAction) clearSelection();

  if (input.mouseButtons[0].wasJustPressed) {
    // A pattern is already in the buffer
    if (!mapArea.patternActor.threeObject.visible) {
      if (mapArea.cursorPoint.x >= 0 && mapArea.cursorPoint.x < pub.width && mapArea.cursorPoint.y >= 0 && mapArea.cursorPoint.y < pub.height) {
        mapArea.patternBackgroundActor.threeObject.visible = true;
        mapArea.selectionStartPoint = { x: mapArea.cursorPoint.x, y: mapArea.cursorPoint.y };
      } else {
        clearSelection();
      }
    }
  }

  if (mapArea.selectionStartPoint == null) return;

  if (input.mouseButtons[0].isDown) {
    // Clamp mouse values
    let x = Math.max(0, Math.min(pub.width - 1, mapArea.cursorPoint.x));
    let y = Math.max(0, Math.min(pub.height - 1, mapArea.cursorPoint.y));

    mapArea.selectionEndPoint = { x, y };
  }

  let startX = Math.min(mapArea.selectionStartPoint.x, mapArea.selectionEndPoint.x);
  let startY = Math.min(mapArea.selectionStartPoint.y, mapArea.selectionEndPoint.y);
  let width = Math.abs(mapArea.selectionEndPoint.x - mapArea.selectionStartPoint.x) + 1;
  let height = Math.abs(mapArea.selectionEndPoint.y - mapArea.selectionStartPoint.y) + 1;

  let ratioX = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.width;
  let ratioY = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.height;
  let z = data.tileMapUpdater.tileMapAsset.layers.pub.length * pub.layerDepthOffset;
  let patternPosition = new SupEngine.THREE.Vector3(startX / ratioX, startY / ratioY, z);
  mapArea.patternBackgroundActor.setLocalPosition(patternPosition);
  let ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(width, height / ratio, 1));

  // Delete selection
  if (input.keyboardButtons[keyEvent.DOM_VK_DELETE].wasJustReleased) {
    let edits: Edits[] = [];
    walkSelection((x, y) => { edits.push({ x: startX + x, y: startY + y, tileValue: 0 }); });
    editMap(edits);

    mapArea.patternBackgroundActor.threeObject.visible = false;
    mapArea.selectionStartPoint = null;
  }

  // Move/duplicate the selection
  else if (input.keyboardButtons[keyEvent.DOM_VK_M].wasJustReleased || input.keyboardButtons[keyEvent.DOM_VK_D].wasJustReleased) {
    let layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];

    mapArea.duplicatingSelection = input.keyboardButtons[keyEvent.DOM_VK_D].wasJustReleased;
    if (!mapArea.duplicatingSelection) {
      let edits: Edits[] = [];
      walkSelection((x, y) => { edits.push({ x: startX + x, y: startY + y, tileValue: 0 }); });
      editMap(edits);
    }

    let layerData: ((number|boolean)[]|number)[] = [];
    walkSelection((x, y) => {
      let tile = layer.data[(startY + y) * pub.width + startX + x];
      layerData.push(tile);
    });

    setupPattern(layerData, width);
    mapArea.patternActor.threeObject.visible = true;
    mapArea.selectionStartPoint = null;
  }
}

function walkSelection(callback: (x: number, y: number) => void) {
  let width = Math.abs(mapArea.selectionEndPoint.x - mapArea.selectionStartPoint.x) + 1;
  let height = Math.abs(mapArea.selectionEndPoint.y - mapArea.selectionStartPoint.y) + 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      callback(x, y);
    }
  }
}

function clearSelection() {
  mapArea.selectionStartPoint = null;
  mapArea.patternBackgroundActor.threeObject.visible = false;
  mapArea.patternActor.threeObject.visible = false;
  mapArea.duplicatingSelection = false;
}

export function selectEntireLayer() {
  mapArea.patternBackgroundActor.threeObject.visible = true;
  mapArea.selectionStartPoint = { x: 0, y: 0 };
  mapArea.selectionEndPoint = {
    x: data.tileMapUpdater.tileMapAsset.pub.width - 1,
    y: data.tileMapUpdater.tileMapAsset.pub.height - 1
  };
}

function handleEraserMode(cursorHasMoved: boolean) {
  if (mapArea.gameInstance.input.mouseButtons[0].isDown)
    editMap([{ x: mapArea.cursorPoint.x, y: mapArea.cursorPoint.y, tileValue: 0 }]);
}
