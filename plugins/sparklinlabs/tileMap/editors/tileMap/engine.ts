import info from "./info";
import ui, { selectBrush, selectFill, selectEraser, selectSelection } from "./ui";
import { socket, data } from "./network";

import * as _ from "lodash";

import TileMapAsset from "../../data/TileMapAsset";
import TileMap from "../../components/TileMap";
import TileMapRenderer from "../../components/TileMapRenderer";

// Map Area
export let mapArea: {
  gameInstance?: SupEngine.GameInstance;

  cameraComponent?: any;
  cameraControls?: any;

  gridActor?: SupEngine.Actor;
  gridRenderer?: any;

  patternData?: (number|boolean)[][]
  patternDataWidth?: number;
  patternActor?: SupEngine.Actor;
  patternRenderer?: TileMapRenderer;
  patternBackgroundActor?: SupEngine.Actor;
  patternBackgroundRenderer?: any;

  duplicatingSelection?: boolean;

  cursorPoint?: { x: number; y : number };
  selectionStartPoint?: { x: number; y : number };
  selectionEndPoint?: { x: number; y : number };
} = {};

mapArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.map"));
mapArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(mapArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 100));
mapArea.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
mapArea.cameraComponent.setOrthographicMode(true);
mapArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](
  cameraActor, mapArea.cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 60 },
  () => { mapArea.gridRenderer.setOrthgraphicScale(mapArea.cameraComponent.orthographicScale); }
);

mapArea.gridActor = new SupEngine.Actor(mapArea.gameInstance, "Grid");
mapArea.gridActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 90));
mapArea.gridRenderer = new SupEngine.editorComponentClasses["GridRenderer"](mapArea.gridActor, {
  width: 1, height: 1, ratio: 1,
  orthographicScale: mapArea.cameraComponent.orthographicScale
});

mapArea.patternData = [];
mapArea.patternDataWidth = 1;
mapArea.patternActor = new SupEngine.Actor(mapArea.gameInstance, "Pattern");
mapArea.patternActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 80))
mapArea.patternRenderer = new TileMapRenderer(mapArea.patternActor, null, null);
mapArea.patternBackgroundActor = new SupEngine.Actor(mapArea.gameInstance, "Pattern Background");
mapArea.patternBackgroundRenderer = new SupEngine.editorComponentClasses["FlatColorRenderer"](mapArea.patternBackgroundActor);

mapArea.duplicatingSelection = false;
mapArea.cursorPoint = { x: -1, y: -1 };

// Tile Set Area
export let tileSetArea: {
  gameInstance?: SupEngine.GameInstance;

  cameraComponent?: any;

  selectedLayerId?: string;

  selectionStartPoint?: { x: number; y : number };
  selectionEndPoint?: { x: number; y : number };
} = {};

tileSetArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector("canvas.tileSet"));
tileSetArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

cameraActor = new SupEngine.Actor(tileSetArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
tileSetArea.cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
tileSetArea.cameraComponent.setOrthographicMode(true);
new SupEngine.editorComponentClasses["Camera2DControls"](
  cameraActor, tileSetArea.cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 60 },
  () => { data.tileSetUpdater.tileSetRenderer.gridRenderer.setOrthgraphicScale(tileSetArea.cameraComponent.orthographicScale); }
);

export function setupPattern(layerData: (number|boolean)[][], width=1) {
  mapArea.patternData = layerData;
  mapArea.patternDataWidth = width;

  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let height = layerData.length / width;

  let patternLayerData: (number|boolean)[][] = [];
  for (let y = 0; y < pub.height; y++) {
    for (let x = 0; x < pub.width; x++) {
      let localX = x - mapArea.cursorPoint.x;
      let localY = y - mapArea.cursorPoint.y;

      if (localX < 0 || localX >= width || localY < 0 || localY >= height) patternLayerData.push(TileMapAsset.emptyTile);
      else patternLayerData.push(layerData[localY * width + localX]);
    }
  }

  let patternData = {
    tileSetId: <string>null,
    width: pub.width, height: pub.height,
    pixelsPerUnit: pub.pixelsPerUnit,
    layerDepthOffset: pub.layerDepthOffset,
    layers: [ { id: "0", name: "pattern", data: patternLayerData } ]
  };

  mapArea.patternRenderer.setTileMap(new TileMap(patternData));
}

export function setupFillPattern(newTileData: (number|boolean)[]) {
  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let layerData = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId].data

  let patternLayerData: (number|boolean)[][] = [];
  for (let y = 0; y < pub.height; y++) {
    for (let x = 0; x < pub.width; x++) {
      patternLayerData.push(TileMapAsset.emptyTile);
    }
  }

  let refTileData = layerData[mapArea.cursorPoint.y * pub.width + mapArea.cursorPoint.x];
  function checkTile(x: number, y: number) {
    if (x < 0 || x >= pub.width || y < 0 || y >= pub.height) return;

    let index = y * pub.width + x;
    // Skip if target tile on pattern isn't empty
    let patternTile = patternLayerData[index];
    for (let i = 0; i < TileMapAsset.emptyTile.length; i++) {
      if (patternTile[i] !== TileMapAsset.emptyTile[i]) return;
    }

    // Skip if taget tile on layer is different from the base tile
    let layerTile = layerData[index];
    for (let i = 0; i < layerTile.length; i++) {
      if (layerTile[i] !== refTileData[i]) return;
    }

    patternLayerData[index] = _.cloneDeep(newTileData);

    checkTile(x-1, y);
    checkTile(x+1, y);
    checkTile(x, y-1);
    checkTile(x, y+1);
  }

  if (mapArea.cursorPoint.x >= 0 && mapArea.cursorPoint.x < pub.width && mapArea.cursorPoint.y >= 0 && mapArea.cursorPoint.y < pub.height)
    checkTile(mapArea.cursorPoint.x, mapArea.cursorPoint.y)

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
  let layerData: (number|boolean)[][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = width - 1; x >= 0; x--) {
      let tileValue = mapArea.patternData[y * width + x];
      tileValue[2] = !tileValue[2];
      layerData.push(tileValue);
    }
  }

  setupPattern(layerData, width);
}

export function flipTilesVertically() {
  if (!mapArea.patternActor.threeObject.visible) return;

  let width = mapArea.patternDataWidth;
  let height = mapArea.patternData.length / mapArea.patternDataWidth;
  let layerData: (number|boolean)[][] = [];
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      let tileValue = mapArea.patternData[y * width + x];
      tileValue[3] = !tileValue[3];

      layerData.push(tileValue);
    }
  }

  setupPattern(layerData, width);
}

export function rotateTiles() {
  if (!mapArea.patternActor.threeObject.visible) return;

  let width = mapArea.patternDataWidth;
  let height = mapArea.patternData.length / mapArea.patternDataWidth;
  let layerData: (number|boolean)[][] = [];
  for (let x = 0; x < width; x++) {
    for (let y = height - 1; y >= 0; y--) {
      let tileValue = mapArea.patternData[y * width + x];
      (<any>tileValue)[4] += 90;
      if (tileValue[4] === 360) tileValue[4] = 0;

      layerData.push(tileValue);
    }
  }

  setupPattern(layerData, height);
  mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(height, width, 1));
}

function draw() {
  requestAnimationFrame(draw);

  mapArea.gameInstance.update();
  handleMapArea();
  mapArea.gameInstance.draw();

  tileSetArea.gameInstance.update();
  handleTileSetArea();
  tileSetArea.gameInstance.draw();
}
requestAnimationFrame(draw);

interface Edits {
  x: number;
  y: number;
  tileValue: (number|boolean)[];
}

function editMap(edits: Edits[]) {
  let actualEdits: Edits[] = [];
  let layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];

  for (let edit of edits) {
    if (edit.x >= 0 && edit.x < data.tileMapUpdater.tileMapAsset.pub.width && edit.y >= 0 && edit.y < data.tileMapUpdater.tileMapAsset.pub.height) {

      let index = edit.y * data.tileMapUpdater.tileMapAsset.pub.width + edit.x;

      let sameTile = true;
      for (let i = 0; i < edit.tileValue.length; i++) {
        if (layer.data[index][i] !== edit.tileValue[i]) {
          sameTile = false;
          break;
        }
      }
      if (! sameTile) actualEdits.push(edit);
    }
  }

  if (actualEdits.length === 0) return;
  socket.emit("edit:assets", info.assetId, "editMap", layer.id, actualEdits, (err: string) => {
    if (err != null) { alert(err); return; }
  });
}

function getMapGridPosition(gameInstance: SupEngine.GameInstance, cameraComponent: any) {
  let mousePosition = gameInstance.input.mousePosition;
  let position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
  let cameraPosition = cameraComponent.actor.getLocalPosition();

  let x = position.x / gameInstance.threeRenderer.domElement.width;
  x = x * 2 - 1;
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
  x += cameraPosition.x;
  x *= data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
  x = Math.floor(x);

  let y = position.y / gameInstance.threeRenderer.domElement.height;
  y = y * 2 - 1;
  y *= cameraComponent.orthographicScale / 2;
  y -= cameraPosition.y;
  y *= data.tileMapUpdater.tileMapAsset.pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
  y = Math.floor(y);

  return [ x, -y - 1 ];
}

function handleMapArea() {
  if (data.tileMapUpdater == null) return;
  if (data.tileMapUpdater.tileMapAsset == null) return;
  if (data.tileMapUpdater.tileSetAsset == null) return;

  let pub = data.tileMapUpdater.tileMapAsset.pub;
  let [ mouseX, mouseY ] = getMapGridPosition(mapArea.gameInstance, mapArea.cameraComponent);
  if (mouseX != mapArea.cursorPoint.x || mouseY != mapArea.cursorPoint.y) {
    mapArea.cursorPoint.x = mouseX;
    mapArea.cursorPoint.y = mouseY;

    if (ui.fillToolButton.checked) {
      let position = data.tileSetUpdater.tileSetRenderer.selectedTileActor.getLocalPosition();
      setupFillPattern([ position.x, -position.y, false, false, 0 ]);
    }
    else if (mapArea.patternActor.threeObject.visible) setupPattern(mapArea.patternData, mapArea.patternDataWidth);
  }

  // Edit tiles
  if (mapArea.gameInstance.input.mouseButtons[0].isDown) {
    if (ui.eraserToolButton.checked) {
      editMap([{ x: mouseX, y: mouseY, tileValue: TileMapAsset.emptyTile }]);

    } else if (ui.fillToolButton.checked) {
      let edits: Edits[] = [];
      let layerData = mapArea.patternRenderer.tileMap.data.layers[0].data;

      for (let y = 0; y < pub.height; y++) {
        for (let x = 0; x < pub.width; x++) {
          let index = y * pub.width + x;
          let tileValue = layerData[index];

          let emptyTile = true;
          for (let i = 0; i < TileMapAsset.emptyTile.length; i++) {
            if (tileValue[i] !== TileMapAsset.emptyTile[i]) {
              emptyTile = false;
              break;
            }
          }

          if (! emptyTile) edits.push({ x, y, tileValue });
        }
      }
      editMap(edits);

    } else if (mapArea.patternActor.threeObject.visible) {

      let edits: Edits[] = [];
      for (let tileIndex = 0; tileIndex < mapArea.patternData.length; tileIndex++) {
        let tileValue = mapArea.patternData[tileIndex];
        let x = mouseX + tileIndex % mapArea.patternDataWidth;
        let y = mouseY + Math.floor(tileIndex / mapArea.patternDataWidth);

        edits.push({ x, y, tileValue });
      }
      editMap(edits);

      if (ui.selectionToolButton.checked && ! mapArea.duplicatingSelection) {
        mapArea.patternActor.threeObject.visible = false;
        mapArea.patternBackgroundActor.threeObject.visible = false;
      }
    }
  }

  // Quick switch to Brush or Eraser
  if (mapArea.gameInstance.input.mouseButtons[2].wasJustReleased && !ui.fillToolButton.checked)  {
    if (!ui.selectionToolButton.checked || !mapArea.patternBackgroundActor.threeObject.visible) {
      if (mouseX >= 0 && mouseX < pub.width && mouseY >= 0 && mouseY < pub.height) {
        let layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];
        let tile = layer.data[mouseY * pub.width + mouseX];
        if (tile[0] == -1) {
          selectEraser();
        } else {
          setupPattern([ tile ]);
          selectBrush(<number>tile[0], <number>tile[1]);
        }
      }
    } else {
      mapArea.selectionStartPoint = null;
      mapArea.patternBackgroundActor.threeObject.visible = false;
      mapArea.patternActor.threeObject.visible = false;
      mapArea.duplicatingSelection = false;
    }
  }

  if (mapArea.patternActor.threeObject.visible || ui.eraserToolButton.checked) {
    let ratio = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
    let patternPosition = new SupEngine.THREE.Vector3(mouseX/ratio, mouseY/ratio, data.tileMapUpdater.tileMapAsset.layers.pub.length * pub.layerDepthOffset);
    mapArea.patternBackgroundActor.setLocalPosition(patternPosition);
  }

  // Select all
  if (mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_CONTROL].isDown &&
  mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_A].wasJustPressed) {
    selectSelection();
    mapArea.patternBackgroundActor.threeObject.visible = true;
    mapArea.selectionStartPoint = { x: 0, y: 0 };
    mapArea.selectionEndPoint = {
      x: pub.width - 1,
      y: pub.height - 1
    };
  }

  // Selection
  if (ui.selectionToolButton.checked) {

    if (mapArea.gameInstance.input.mouseButtons[0].wasJustPressed) {
      // A pattern is already in the buffer
      if (!mapArea.patternActor.threeObject.visible) {
        if (mouseX >= 0 && mouseX < pub.width && mouseY >= 0 && mouseY < pub.height) {
          mapArea.patternBackgroundActor.threeObject.visible = true;
          mapArea.selectionStartPoint = { x: mouseX, y: mouseY };

        } else {
          mapArea.selectionStartPoint = null;
          mapArea.patternActor.threeObject.visible = false;
          mapArea.patternBackgroundActor.threeObject.visible = false;
        }
      }
    }

    if (mapArea.selectionStartPoint != null) {
      if (mapArea.gameInstance.input.mouseButtons[0].isDown) {
        // Clamp mouse values
        let x = Math.max(0, Math.min(pub.width - 1, mouseX));
        let y = Math.max(0, Math.min(pub.height - 1, mouseY));

        mapArea.selectionEndPoint = { x, y };
      }

      let startX = Math.min(mapArea.selectionStartPoint.x, mapArea.selectionEndPoint.x);
      let startY = Math.min(mapArea.selectionStartPoint.y, mapArea.selectionEndPoint.y);
      let width = Math.abs(mapArea.selectionEndPoint.x - mapArea.selectionStartPoint.x) + 1;
      let height = Math.abs(mapArea.selectionEndPoint.y - mapArea.selectionStartPoint.y) + 1;

      let ratio = pub.pixelsPerUnit / data.tileMapUpdater.tileSetAsset.pub.gridSize;
      let patternPosition = new SupEngine.THREE.Vector3(startX/ratio, startY/ratio, data.tileMapUpdater.tileMapAsset.layers.pub.length * pub.layerDepthOffset);
      mapArea.patternBackgroundActor.setLocalPosition(patternPosition);
      mapArea.patternBackgroundActor.setLocalScale(new SupEngine.THREE.Vector3(width, height, 1));

      // Delete selection
      if (mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_DELETE].wasJustReleased) {
        let edits: Edits[] = [];
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            edits.push({ x: startX + x, y: startY + y, tileValue: TileMapAsset.emptyTile });
          }
        }
        editMap(edits);

        mapArea.patternBackgroundActor.threeObject.visible = false;
        mapArea.selectionStartPoint = null;
      }

      // Move/duplicate the selection
      else if (mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_M].wasJustReleased ||
      mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_D].wasJustReleased) {
        let layerData: (number|boolean)[][] = [];
        let layer = data.tileMapUpdater.tileMapAsset.layers.byId[tileSetArea.selectedLayerId];

        let edits: Edits[] = [];
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            let tile = layer.data[(startY + y) * pub.width + startX + x];
            layerData.push(tile);

            if (!mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_D].wasJustReleased)
              edits.push({ x: startX + x, y: startY + y, tileValue: TileMapAsset.emptyTile });
          }
        }
        editMap(edits);

        setupPattern(layerData, width);
        mapArea.patternActor.threeObject.visible = true;
        mapArea.selectionStartPoint = null;

        mapArea.duplicatingSelection = mapArea.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_D].wasJustReleased;
      }
    }
  }
}

function getTileSetGridPosition(gameInstance: SupEngine.GameInstance, cameraComponent: any) {
  let mousePosition = gameInstance.input.mousePosition;
  let position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
  let cameraPosition = cameraComponent.actor.getLocalPosition();

  let x = position.x / gameInstance.threeRenderer.domElement.width;
  x = x * 2 - 1;
  x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
  x += cameraPosition.x;
  x = Math.floor(x);

  let y = position.y / gameInstance.threeRenderer.domElement.height;
  y = y * 2 - 1;
  y *= cameraComponent.orthographicScale / 2;
  y -= cameraPosition.y;
  y = Math.floor(y);

  return [ x, y ];
}

function handleTileSetArea() {
  if (data.tileMapUpdater == null) return;
  if (data.tileMapUpdater.tileMapAsset == null) return;
  if (data.tileMapUpdater.tileSetAsset == null) return;

  let tilesPerRow = data.tileMapUpdater.tileSetAsset.pub.domImage.width / data.tileMapUpdater.tileSetAsset.pub.gridSize;
  let tilesPerColumn = data.tileMapUpdater.tileSetAsset.pub.domImage.height / data.tileMapUpdater.tileSetAsset.pub.gridSize;

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
