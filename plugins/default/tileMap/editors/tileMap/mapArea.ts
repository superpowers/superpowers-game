import ui, { selectBrushTool, selectEraserTool } from "./ui";
import tileSetArea from "./tileSetArea";
import { data } from "./network";

import * as _ from "lodash";

import TileMap from "../../components/TileMap";
import TileMapRenderer from "../../components/TileMapRenderer";

const tmpVector3 = new SupEngine.THREE.Vector3();

// Map Area
const mapArea: {
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

const cameraActor = new SupEngine.Actor(mapArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 100));
mapArea.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
mapArea.cameraComponent.setOrthographicMode(true);
mapArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](
  cameraActor, mapArea.cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 0.1, zoomMax: 10000 },
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

  const pub = data.tileMapUpdater.tileMapAsset.pub;
  const height = layerData.length / width;

  if (startX == null) startX = mapArea.cursorPoint.x;
  if (startY == null) startY = mapArea.cursorPoint.y;

  const patternLayerData: ((number|boolean)[]|number)[] = [];
  for (let y = 0; y < pub.height; y++) {
    for (let x = 0; x < pub.width; x++) {
      let localX = x - startX;
      let localY = y - startY;

      if (localX < 0 || localX >= width || localY < 0 || localY >= height) patternLayerData.push(0);
      else patternLayerData.push(layerData[localY * width + localX]);
    }
  }

  const patternData = {
    tileSetId: null as string,
    width: pub.width, height: pub.height,
    pixelsPerUnit: pub.pixelsPerUnit,
    layerDepthOffset: pub.layerDepthOffset,
    layers: [ { id: "0", name: "pattern", data: patternLayerData } ]
  };

  mapArea.patternRenderer.setTileMap(new TileMap(patternData));
}

export function setupFillPattern(newTileData: TileData) {
  const pub = data.tileMapUpdater.tileMapAsset.pub;
  const layerData = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId].data;

  const patternLayerData: ((number|boolean)[]|number)[] = [];
  for (let y = 0; y < pub.height; y++) {
    for (let x = 0; x < pub.width; x++) {
      patternLayerData.push(0);
    }
  }

  const refTileData = <(number|boolean)[]>layerData[mapArea.cursorPoint.y * pub.width + mapArea.cursorPoint.x];
  function checkTile(x: number, y: number) {
    if (x < 0 || x >= pub.width || y < 0 || y >= pub.height) return;

    const index = y * pub.width + x;
    // Skip if target tile on pattern isn't empty
    const patternTile = patternLayerData[index];
    if (patternTile !== 0) return;

    // Skip if target tile on layer is different from the base tile
    const layerTile = <(number|boolean)[]>layerData[index];
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

  const patternData = {
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

  const width = mapArea.patternDataWidth;
  const height = mapArea.patternData.length / mapArea.patternDataWidth;
  const layerData: ((number|boolean)[]|number)[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = width - 1; x >= 0; x--) {
      const tileValue = mapArea.patternData[y * width + x];
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

  const width = mapArea.patternDataWidth;
  const height = mapArea.patternData.length / mapArea.patternDataWidth;
  const layerData: TileData[] = [];
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const tileValue = mapArea.patternData[y * width + x];
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

  const width = mapArea.patternDataWidth;
  const height = mapArea.patternData.length / mapArea.patternDataWidth;
  const layerData: TileData[] = [];
  for (let x = 0; x < width; x++) {
    for (let y = height - 1; y >= 0; y--) {
      const tileValue = mapArea.patternData[y * width + x];
      if (typeof tileValue === "number") layerData.push(0);
      else {
        (<any>tileValue)[4] += 90;
        if (tileValue[4] === 360) tileValue[4] = 0;

        layerData.push(tileValue);
      }
    }
  }

  setupPattern(layerData, height);
  const ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(height, width / ratio, 1));
}

interface Edits {
  x: number;
  y: number;
  tileValue: ((number|boolean)[]|number);
}

function getEditsFromPattern(point: { x: number; y: number }) {
  const edits: Edits[] = [];
  for (let tileIndex = 0; tileIndex < mapArea.patternData.length; tileIndex++) {
    const tileValue = mapArea.patternData[tileIndex];
    const x = point.x + tileIndex % mapArea.patternDataWidth;
    const y = point.y + Math.floor(tileIndex / mapArea.patternDataWidth);

    edits.push({ x, y, tileValue });
  }
  return edits;
}

function editMap(edits: Edits[]) {
  const actualEdits: Edits[] = [];
  const layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];

  for (const edit of edits) {
    if (edit.x >= 0 && edit.x < data.tileMapUpdater.tileMapAsset.pub.width && edit.y >= 0 && edit.y < data.tileMapUpdater.tileMapAsset.pub.height) {

      const index = edit.y * data.tileMapUpdater.tileMapAsset.pub.width + edit.x;

      let sameTile = true;
      if (edit.tileValue === 0) {
        if (layer.data[index] !== 0) sameTile = false;
      } else {
        const tileValue = edit.tileValue as (number|boolean)[];
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
  data.projectClient.editAsset(SupClient.query.asset, "editMap", layer.id, actualEdits);
}

function getMapGridPosition(gameInstance: SupEngine.GameInstance, cameraComponent: any) {
  const mousePosition = gameInstance.input.mousePosition;
  const position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
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

  const pub = data.tileMapUpdater.tileMapAsset.pub;
  const input = mapArea.gameInstance.input;

  const [ mouseX, mouseY ] = getMapGridPosition(mapArea.gameInstance, mapArea.cameraComponent);
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
      const layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
      const tile = layer.data[mouseY * pub.width + mouseX];
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
    const layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
    const z = (pub.layers.indexOf(layer) + 0.5) * pub.layerDepthOffset;
    const ratioX = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.width;
    const ratioY = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.height;
    const patternPosition = new SupEngine.THREE.Vector3(mouseX / ratioX, mouseY / ratioY, z);
    mapArea.patternBackgroundActor.setLocalPosition(patternPosition);
  }
}

function handleBrushMode(cursorHasMoved: boolean) {
  const pub = data.tileMapUpdater.tileMapAsset.pub;
  const input = mapArea.gameInstance.input;

  const shiftKey = input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_SHIFT];

  if (input.mouseButtons[0].isDown) {
    if (mapArea.lastTile != null && shiftKey.isDown) {
      const xMin = Math.min(mapArea.cursorPoint.x, mapArea.lastTile.x);
      const xOffset = Math.abs(mapArea.cursorPoint.x - mapArea.lastTile.x) + 1;
      const yMin = Math.min(mapArea.cursorPoint.y, mapArea.lastTile.y);
      const yOffset = Math.abs(mapArea.cursorPoint.y - mapArea.lastTile.y) + 1;

      const point = { x: 0, y: 0 };
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

    const x = mapArea.cursorPoint.x;
    const y = mapArea.cursorPoint.y;
    if (mapArea.patternData.length === 1 && x >= 0 && x < pub.width && y >= 0 && y < pub.height)
      mapArea.lastTile = { x, y, tile: (mapArea.patternData[0] as (number|boolean)[]).slice() };

  } else if (mapArea.lastTile != null && shiftKey.wasJustReleased) {
    setupPattern([mapArea.lastTile.tile]);

  } else if (mapArea.lastTile != null && shiftKey.isDown) {
    const xMin = Math.min(mapArea.cursorPoint.x, mapArea.lastTile.x);
    const xOffset = Math.abs(mapArea.cursorPoint.x - mapArea.lastTile.x) + 1;
    const yMin = Math.min(mapArea.cursorPoint.y, mapArea.lastTile.y);
    const yOffset = Math.abs(mapArea.cursorPoint.y - mapArea.lastTile.y) + 1;

    const patternData: TileData[] = [];
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

  const pub = data.tileMapUpdater.tileMapAsset.pub;
  const edits: Edits[] = [];
  for (let y = 0; y < pub.height; y++) {
    for (let x = 0; x < pub.width; x++) {
      const tileValue = mapArea.patternRenderer.tileMap.getTileAt(0, x, y);
      if (tileValue !== 0) edits.push({ x, y, tileValue });
    }
  }
  editMap(edits);
}

function handleSelectionMode(cursorHasMoved: boolean) {
  const pub = data.tileMapUpdater.tileMapAsset.pub;
  const input = mapArea.gameInstance.input;
  const keyEvent = (<any>window).KeyEvent;

  const cancelAction = input.mouseButtons[2].wasJustPressed || input.keyboardButtons[keyEvent.DOM_VK_ESCAPE].wasJustPressed;

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
    const x = Math.max(0, Math.min(pub.width - 1, mapArea.cursorPoint.x));
    const y = Math.max(0, Math.min(pub.height - 1, mapArea.cursorPoint.y));

    mapArea.selectionEndPoint = { x, y };
  }

  const startX = Math.min(mapArea.selectionStartPoint.x, mapArea.selectionEndPoint.x);
  const startY = Math.min(mapArea.selectionStartPoint.y, mapArea.selectionEndPoint.y);
  const width = Math.abs(mapArea.selectionEndPoint.x - mapArea.selectionStartPoint.x) + 1;
  const height = Math.abs(mapArea.selectionEndPoint.y - mapArea.selectionStartPoint.y) + 1;

  const ratioX = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.width;
  const ratioY = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.grid.height;
  const z = data.tileMapUpdater.tileMapAsset.layers.pub.length * pub.layerDepthOffset;
  const patternPosition = new SupEngine.THREE.Vector3(startX / ratioX, startY / ratioY, z);
  mapArea.patternBackgroundActor.setLocalPosition(patternPosition);
  const ratio = data.tileSetUpdater.tileSetAsset.pub.grid.width / data.tileSetUpdater.tileSetAsset.pub.grid.height;
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(width, height / ratio, 1));

  // Delete selection
  if (input.keyboardButtons[keyEvent.DOM_VK_DELETE].wasJustReleased) {
    const edits: Edits[] = [];
    walkSelection((x, y) => { edits.push({ x: startX + x, y: startY + y, tileValue: 0 }); });
    editMap(edits);

    mapArea.patternBackgroundActor.threeObject.visible = false;
    mapArea.selectionStartPoint = null;
  }

  // Move/duplicate the selection
  else if (input.keyboardButtons[keyEvent.DOM_VK_M].wasJustReleased || input.keyboardButtons[keyEvent.DOM_VK_D].wasJustReleased) {
    const layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];

    mapArea.duplicatingSelection = input.keyboardButtons[keyEvent.DOM_VK_D].wasJustReleased;
    if (!mapArea.duplicatingSelection) {
      const edits: Edits[] = [];
      walkSelection((x, y) => { edits.push({ x: startX + x, y: startY + y, tileValue: 0 }); });
      editMap(edits);
    }

    const layerData: ((number|boolean)[]|number)[] = [];
    walkSelection((x, y) => {
      const tile = layer.data[(startY + y) * pub.width + startX + x];
      layerData.push(tile);
    });

    setupPattern(layerData, width);
    mapArea.patternActor.threeObject.visible = true;
    mapArea.selectionStartPoint = null;
  }
}

function walkSelection(callback: (x: number, y: number) => void) {
  const width = Math.abs(mapArea.selectionEndPoint.x - mapArea.selectionStartPoint.x) + 1;
  const height = Math.abs(mapArea.selectionEndPoint.y - mapArea.selectionStartPoint.y) + 1;

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
