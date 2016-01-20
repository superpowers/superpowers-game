import ui, { setupSelectedNode } from "./ui";
import { data, editAsset } from "./network";
import { Node, getShapeTextureFaceSize } from "../../data/CubicModelNodes";
import { TextureEdit } from "../../data/CubicModelAsset";

let THREE = SupEngine.THREE;
let tmpVector3 = new THREE.Vector3();

let textureArea: {
  gameInstance: SupEngine.GameInstance;
  cameraControls: any;
  shapeLineMeshesByNodeId: { [nodeId: string]: THREE.LineSegments; }

  textureMesh: THREE.Mesh;
  selectionRenderer: any;

  mode: string;
  paintTool: string;
  colorInput: HTMLInputElement;

  pasteActor: SupEngine.Actor;
  pasteMesh: THREE.Mesh;
} = { shapeLineMeshesByNodeId: {} } as any;
export default textureArea;

let canvas = document.querySelector(".texture-container canvas") as HTMLCanvasElement;
if (SupClient.isApp) {
  let electron: GitHubElectron.Electron = (top as any).global.require("electron");

  document.addEventListener("copy", (event: ClipboardEvent) => {
    if (document.activeElement !== canvas) return;

    let dataURL = data.cubicModelUpdater.cubicModelAsset.clientTextureDatas["map"].ctx.canvas.toDataURL();
    electron.clipboard.writeImage(electron.nativeImage.createFromDataURL(dataURL));
  });
}

let pasteCtx = document.createElement("canvas").getContext("2d");
document.addEventListener("paste", (event: ClipboardEvent) => {
  if (document.activeElement !== canvas) return;
  if (event.clipboardData.items[0] == null) return;
  if (event.clipboardData.items[0].type.indexOf("image") === -1) return;
  if (textureArea.mode !== "paint") return;

  if (textureArea.pasteMesh != null) clearPasteSelection();

  let imageBlob = (event.clipboardData.items[0] as any).getAsFile();
  let image = new Image();
  image.src = URL.createObjectURL(imageBlob);
  image.onload = () => {
    pasteCtx.canvas.width = image.width;
    pasteCtx.canvas.height = image.height;
    pasteCtx.drawImage(image, 0, 0);

    let texture = new THREE.Texture(pasteCtx.canvas);
    texture.needsUpdate = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    let geom = new THREE.PlaneBufferGeometry(image.width, image.height, 1, 1);
    let mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, map: texture });
    textureArea.pasteMesh = new THREE.Mesh(geom, mat);
    textureArea.pasteActor.threeObject.add(textureArea.pasteMesh);
    textureArea.pasteActor.setLocalPosition(tmpVector3.set(image.width / 2, -image.height / 2, 1));

    textureArea.selectionRenderer.setSize(image.width, image.height);
    textureArea.selectionRenderer.actor.setParent(textureArea.pasteActor);
    textureArea.selectionRenderer.actor.setLocalPosition(tmpVector3.set(0, 0, 5));
    textureArea.selectionRenderer.actor.threeObject.visible = true;
  };
});

textureArea.gameInstance = new SupEngine.GameInstance(canvas);
textureArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(textureArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
cameraComponent.setOrthographicMode(true);
cameraComponent.setOrthographicScale(10);
textureArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 200 });

let selectionActor = new SupEngine.Actor(textureArea.gameInstance, "Selection");
textureArea.selectionRenderer = new SupEngine.editorComponentClasses["SelectionRenderer"](selectionActor);

textureArea.pasteActor = new SupEngine.Actor(textureArea.gameInstance, "Paste");

function clearPasteSelection() {
  textureArea.pasteActor.threeObject.remove(textureArea.pasteMesh);
  textureArea.selectionRenderer.actor.setParent(null);
  textureArea.selectionRenderer.actor.threeObject.visible = false;
  textureArea.pasteMesh = null;
}

export function setup() {
  setupTexture();
  data.cubicModelUpdater.cubicModelAsset.nodes.walk(addNode);
}

export function setupTexture() {
  if (textureArea.textureMesh != null) textureArea.gameInstance.threeScene.remove(textureArea.textureMesh);

  let asset = data.cubicModelUpdater.cubicModelAsset;
  let threeTexture = data.cubicModelUpdater.cubicModelAsset.pub.textures["map"];

  let geom = new THREE.PlaneBufferGeometry(asset.pub.textureWidth, asset.pub.textureHeight, 1, 1);
  let mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, map: threeTexture });
  textureArea.textureMesh = new THREE.Mesh(geom, mat);
  textureArea.textureMesh.position.set(asset.pub.textureWidth / 2, -asset.pub.textureHeight / 2, -1);

  textureArea.gameInstance.threeScene.add(textureArea.textureMesh);
  textureArea.textureMesh.updateMatrixWorld(false);
}

textureArea.mode = "layout";
updateMode();
document.querySelector(".texture-container .controls .mode-selection").addEventListener("click", (event) => {
  const target = event.target as HTMLInputElement;
  if (target.tagName !== "INPUT") return;

  textureArea.mode = target.value;
  updateMode();
  clearPasteSelection();
});

textureArea.paintTool = "brush";
document.querySelector(".texture-container .controls .paint-mode-container .tool").addEventListener("click", (event) => {
  const target = event.target as HTMLInputElement;
  if (target.tagName !== "INPUT") return;

  textureArea.paintTool = target.value;
});

function updateMode() {
  for (const mode of [ "layout", "paint" ]) {
    const container = document.querySelector(`.${mode}-mode-container`) as HTMLDivElement;
    container.hidden = mode !== textureArea.mode;
  }
}

textureArea.colorInput = document.querySelector("input.color") as HTMLInputElement;
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, opacity: 0.4, depthTest: false, depthWrite: false, transparent: true });
const selectedLineMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, opacity: 1, depthTest: false, depthWrite: false, transparent: true });
const verticesByShapeType: { [type: string]: number } = {
  "none": 0,
  "box": 20
};

export function addNode(node: Node) {
  let geometry = new THREE.Geometry();
  let line = new THREE.LineSegments(geometry, lineMaterial);
  textureArea.shapeLineMeshesByNodeId[node.id] = line;

  textureArea.gameInstance.threeScene.add(line);
  line.updateMatrixWorld(false);
  updateNode(node);
}

export function updateNode(node: Node) {
  let line = textureArea.shapeLineMeshesByNodeId[node.id];

  let verticesCount = verticesByShapeType[node.shape.type];
  let vertices = (line.geometry as THREE.Geometry).vertices;

  if (vertices.length < verticesCount) {
    for (let i = vertices.length; i < verticesCount; i++) vertices.push(new THREE.Vector3(0, 0, 0));
  } else if (vertices.length > verticesCount) {
    vertices.length = verticesCount;
  }

  // let origin = { x: node.shape.textureOffset.x, y: -node.shape.textureOffset.y };
  // TEMPORARY
  let origin = { x: node.shape.textureLayout["left"].offset.x, y: -node.shape.textureLayout["top"].offset.y };

  switch (node.shape.type) {
    case "box":
      let size: { x: number; y: number; z: number; } = node.shape.settings.size;

      // Top horizontal line
      vertices[0].set(origin.x + size.z, origin.y, 1);
      vertices[1].set(origin.x + size.z + size.x * 2, origin.y, 1);

      // Shared horizontal line
      vertices[2].set(origin.x, origin.y - size.z, 1);
      vertices[3].set(origin.x + size.x * 2 + size.z * 2, origin.y - size.z, 1);

      // Bottom horizontal line
      vertices[4].set(origin.x, origin.y - size.z - size.y, 1);
      vertices[5].set(origin.x + size.x * 2 + size.z * 2, origin.y - size.z - size.y, 1);

      // Shared vertical line
      vertices[6].set(origin.x + size.z, origin.y, 1);
      vertices[7].set(origin.x + size.z, origin.y - size.z - size.y, 1);


      // First row, second vertical line
      vertices[8].set(origin.x + size.z + size.x, origin.y, 1);
      vertices[9].set(origin.x + size.z + size.x, origin.y - size.z, 1);

      // First row, third vertical line
      vertices[10].set(origin.x + size.z + size.x * 2, origin.y, 1);
      vertices[11].set(origin.x + size.z + size.x * 2, origin.y - size.z, 1);


      // Second row, first vertical line
      vertices[12].set(origin.x, origin.y - size.z, 1);
      vertices[13].set(origin.x, origin.y - size.z - size.y, 1);

      // Second row, fifth vertical line
      vertices[14].set(origin.x + size.x * 2 + size.z * 2, origin.y - size.z, 1);
      vertices[15].set(origin.x + size.x * 2 + size.z * 2, origin.y - size.z - size.y, 1);

      // Second row, third vertical line
      vertices[16].set(origin.x + size.x + size.z, origin.y - size.z, 1);
      vertices[17].set(origin.x + size.x + size.z, origin.y - size.z - size.y, 1);

      // Second row, fourth vertical line
      vertices[18].set(origin.x + size.x + size.z * 2, origin.y - size.z, 1);
      vertices[19].set(origin.x + size.x + size.z * 2, origin.y - size.z - size.y, 1);

      break;
  }

  (line.geometry as THREE.Geometry).verticesNeedUpdate = true;
}

export function updateRemovedNode() {
  for (let nodeId in textureArea.shapeLineMeshesByNodeId) {
    if (data.cubicModelUpdater.cubicModelAsset.nodes.byId[nodeId] != null) continue;

    let line = textureArea.shapeLineMeshesByNodeId[nodeId];
    line.parent.remove(line);
    line.geometry.dispose();
    delete textureArea.shapeLineMeshesByNodeId[nodeId];
  }
}

let selectedNodeLineMeshes: THREE.LineSegments[] = [];
export function setSelectedNode(nodeIds: string[]) {
  for (let selectedNodeLineMesh of selectedNodeLineMeshes) selectedNodeLineMesh.material = lineMaterial;
  selectedNodeLineMeshes.length = 0;

  for (let nodeId of nodeIds) {
    let selectedNodeLineMesh = textureArea.shapeLineMeshesByNodeId[nodeId];
    selectedNodeLineMesh.material = selectedLineMaterial;
    selectedNodeLineMeshes.push(selectedNodeLineMesh);
  }
}

let mousePosition = new THREE.Vector3();
let cameraPosition = new THREE.Vector3();

let isDrawing = false;
let isDragging = false;
let isMouseDown = false;
let hasMouseMoved = false;
let previousMousePosition = new THREE.Vector3();

export function handleTextureArea() {
  let inputs = textureArea.gameInstance.input;
  let keys = (window as any).KeyEvent;

  mousePosition.set(inputs.mousePosition.x, inputs.mousePosition.y, 0);
  cameraComponent.actor.getLocalPosition(cameraPosition);

  mousePosition.x /= textureArea.gameInstance.threeRenderer.domElement.width;
  mousePosition.x = mousePosition.x * 2 - 1;
  mousePosition.x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
  mousePosition.x += cameraPosition.x;
  mousePosition.x = Math.floor(mousePosition.x);

  mousePosition.y /= textureArea.gameInstance.threeRenderer.domElement.height;
  mousePosition.y = mousePosition.y * 2 - 1;
  mousePosition.y *= cameraComponent.orthographicScale / 2;
  mousePosition.y -= cameraPosition.y;
  mousePosition.y = Math.floor(mousePosition.y);

  if (textureArea.mode === "layout") {
    if (isMouseDown && !inputs.mouseButtons[0].isDown) {
      isDragging = false;
      isMouseDown = false;

      if (!hasMouseMoved && !isDragging) {
        let hoveredNodeIds = getHoveredNodeIds();

        let isShiftDown = inputs.keyboardButtons[keys.DOM_VK_SHIFT].isDown;
        if (!isShiftDown) ui.nodesTreeView.clearSelection();
        if (hoveredNodeIds.length > 0) {
          if (!isShiftDown) {
            let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${hoveredNodeIds[0]}']`) as HTMLLIElement;
            ui.nodesTreeView.addToSelection(nodeElt);
          } else {
            for (let nodeId of hoveredNodeIds) {
              let isAlreadyAdded = false;
              for (let nodeElt of ui.nodesTreeView.selectedNodes) {
                if (nodeId === nodeElt.dataset["id"]) {
                  isAlreadyAdded = true;
                  break;
                }
              }
              if (!isAlreadyAdded) {
                let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`) as HTMLLIElement;
                ui.nodesTreeView.addToSelection(nodeElt);
                break;
              }
            }
          }
        }
        setupSelectedNode();
      }
      hasMouseMoved = false;

    } else if (isDragging) {
      let x = mousePosition.x - previousMousePosition.x;
      let y = mousePosition.y - previousMousePosition.y;

      if (x !== 0 || y !== 0) {
        hasMouseMoved = true;

        let nodeIds = [] as string[];
        for (let selectedNode of ui.nodesTreeView.selectedNodes) nodeIds.push(selectedNode.dataset["id"]);
        editAsset("moveNodeTextureOffset", nodeIds, { x, y });
      }

    } else if (inputs.mouseButtons[0].wasJustPressed) {
      isMouseDown = true;
      hasMouseMoved = false;

      let hoveredNodeIds = getHoveredNodeIds();
      for (let selectedNode of ui.nodesTreeView.selectedNodes) {
        if (hoveredNodeIds.indexOf(selectedNode.dataset["id"]) !== -1) {
          isDragging = true;
          break;
        }
      }
    }
    previousMousePosition.set(mousePosition.x, mousePosition.y, 0);

  } else if (textureArea.mode === "paint") {
    if (isMouseDown && !inputs.mouseButtons[0].isDown) isMouseDown = false;

    // Paste element
    if (textureArea.pasteMesh != null) {
      if (isMouseDown) {
        tmpVector3.set(mousePosition.x + previousMousePosition.x, -mousePosition.y + previousMousePosition.y, 0);
        textureArea.pasteActor.setLocalPosition(tmpVector3);
        return;
      }

      if (inputs.keyboardButtons[keys.DOM_VK_RIGHT].wasJustPressed) {
        textureArea.pasteMesh.position.x += 1;
        textureArea.pasteMesh.updateMatrixWorld(false);
      }
      if (inputs.keyboardButtons[keys.DOM_VK_LEFT].wasJustPressed) {
        textureArea.pasteMesh.position.x -= 1;
        textureArea.pasteMesh.updateMatrixWorld(false);
      }
      if (inputs.keyboardButtons[keys.DOM_VK_UP].wasJustPressed) {
        textureArea.pasteMesh.position.y += 1;
        textureArea.pasteMesh.updateMatrixWorld(false);
      }
      if (inputs.keyboardButtons[keys.DOM_VK_DOWN].wasJustPressed) {
        textureArea.pasteMesh.position.y -= 1;
        textureArea.pasteMesh.updateMatrixWorld(false);
      }

      if (inputs.mouseButtons[0].wasJustPressed) {
        let position = textureArea.pasteActor.getLocalPosition(tmpVector3);
        let width = pasteCtx.canvas.width;
        let height = pasteCtx.canvas.height;
        if (mousePosition.x > position.x - width  / 2 &&  mousePosition.x < position.x + width  / 2 &&
          -mousePosition.y > position.y - height / 2 && -mousePosition.y < position.y + height / 2) {
          isMouseDown = true;
          previousMousePosition.set(position.x - mousePosition.x, position.y + mousePosition.y, 0);
          return;
        }

        let imageData = pasteCtx.getImageData(0, 0, width, height).data;
        let edits: TextureEdit[] = [];

        let startX = position.x - width / 2;
        let startY = -position.y - height / 2;

        for (let i = 0; i < width; i++) {
          for (let j = 0; j < height; j++) {
            let index = j * width + i;
            index *= 4;
            let x = startX + i;
            if (x < 0 || x >= data.cubicModelUpdater.cubicModelAsset.pub.textureWidth) continue;
            let y = startY + j;
            if (y < 0 || y >= data.cubicModelUpdater.cubicModelAsset.pub.textureHeight) continue;

            edits.push({ x, y, value: { r: imageData[index], g: imageData[index + 1], b: imageData[index + 2], a: imageData[index + 3] } });
          }
        }
        editAsset("editTexture", "map", edits);

        clearPasteSelection();
      }
      return;
    }

    // Edit texture
    if (!isDrawing) {
      if (inputs.mouseButtons[0].wasJustPressed) isDrawing = true;
      else if (inputs.mouseButtons[2].wasJustPressed) {
        if (mousePosition.x < 0 || mousePosition.x >= data.cubicModelUpdater.cubicModelAsset.pub.textureWidth) return;
        if (mousePosition.y < 0 || mousePosition.y >= data.cubicModelUpdater.cubicModelAsset.pub.textureHeight) return;

        let textureData = data.cubicModelUpdater.cubicModelAsset.textureDatas["map"];
        let index = mousePosition.y * data.cubicModelUpdater.cubicModelAsset.pub.textureWidth + mousePosition.x;
        index *= 4;
        let r = textureData[index + 0];
        let g = textureData[index + 1];
        let b = textureData[index + 2];
        let a = textureData[index + 3];

        if (a === 0) {
          (document.getElementById("eraser-tool") as HTMLInputElement).checked = true;
          textureArea.paintTool = "eraser";
        } else {
          (document.getElementById("brush-tool") as HTMLInputElement).checked = true;
          textureArea.paintTool = "brush";

          let hex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
          textureArea.colorInput.value = `#${hex}`;
        }
      }
    } else if (!inputs.mouseButtons[0].isDown) isDrawing = false;

    if (isDrawing) {
      if (mousePosition.x < 0 || mousePosition.x >= data.cubicModelUpdater.cubicModelAsset.pub.textureWidth) return;
      if (mousePosition.y < 0 || mousePosition.y >= data.cubicModelUpdater.cubicModelAsset.pub.textureHeight) return;

      let hex = parseInt(textureArea.colorInput.value.slice(1), 16);
      let brush = { r: 0, g: 0, b: 0, a: 0 };
      if (textureArea.paintTool === "brush") {
        brush.r = (hex >> 16 & 255);
        brush.g = (hex >> 8 & 255);
        brush.b = (hex & 255);
        brush.a = 255;
      }

      let mapName = "map";
      let textureData = data.cubicModelUpdater.cubicModelAsset.textureDatas[mapName];
      let index = mousePosition.y * data.cubicModelUpdater.cubicModelAsset.pub.textureWidth + mousePosition.x;
      index *= 4;

      if (textureData[index + 0] !== brush.r || textureData[index + 1] !== brush.g || textureData[index + 2] !== brush.b || textureData[index + 3] !== brush.a) {
        let edits: TextureEdit[] = [];
        edits.push({ x: mousePosition.x, y: mousePosition.y, value: brush });
        editAsset("editTexture", mapName, edits);
      }
    }
  }
}

function getHoveredNodeIds() {
  let hoveredNodeIds = [] as string[];

  for (let nodeId in data.cubicModelUpdater.cubicModelAsset.nodes.byId) {
    let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[nodeId];

    for (let faceName in node.shape.textureLayout) {
      let face = node.shape.textureLayout[faceName];
      let size = getShapeTextureFaceSize(node.shape, faceName);

      if (mousePosition.x >= face.offset.x && mousePosition.x < face.offset.x + size.width &&
      mousePosition.y >= face.offset.y && mousePosition.y < face.offset.y + size.height) {
        hoveredNodeIds.push(nodeId);
        break;
      }
    }
  }
  return hoveredNodeIds;
}
