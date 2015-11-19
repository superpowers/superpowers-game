import ui from "./ui";
import { data, editAsset } from "./network";
import { Node } from "../../data/CubicModelNodes";
import { TextureEdit } from "../../data/CubicModelAsset";

let THREE = SupEngine.THREE;

let textureArea: {
  gameInstance: SupEngine.GameInstance;
  cameraControls: any;
  shapeLineMeshesByNodeId: { [nodeId: string]: THREE.LineSegments; }

  textureMesh: THREE.Mesh;
  //gridRenderer: any;
  //selectionRenderer: SelectionRenderer;

  mode: string;
  paintTool: string;
  colorInput: HTMLInputElement;

  pasteMesh: THREE.Mesh;
} = <any>{ shapeLineMeshesByNodeId: {} };
export default textureArea;

let canvas = <HTMLCanvasElement>document.querySelector(".texture-container canvas");
/*document.addEventListener("copy", (event: ClipboardEvent) => {
  console.log("copy?");
  if (document.activeElement !== canvas) return;

  //event.clipboardData.clearData();
  let ctx = data.cubicModelUpdater.textures["map"].ctx;

  //event.clipboardData.setData("text/plain", "bonjour");
  // let typedArray = new Uint8Array(data.cubicModelUpdater.textures["map"].imageData.data);
  // let blob = new Blob([ typedArray ], { type: "image/png" });

  let imageData = data.cubicModelUpdater.textures["map"].ctx.canvas.toDataURL().replace(/^data:image\/(png|jpg);base64,/, "")
  event.clipboardData.setData("image/png", imageData);

  let dataURL = data.cubicModelUpdater.textures["map"].ctx.canvas.toDataURL();
  let parts = dataURL.split(',');
  let raw = decodeURIComponent(parts[1]);

  // event.clipboardData.clearData();
  // event.clipboardData.items.clear();
  // event.clipboardData.items.add(new File([raw], "test", { type: "image/png" }));
  console.log(event.clipboardData.types);
  // console.log(event.clipboardData.files.item(0));
  event.preventDefault();
  console.log("copy");
});*/

let pasteCtx = document.createElement("canvas").getContext("2d");
document.addEventListener("paste", (event: ClipboardEvent) => {
  if (document.activeElement !== canvas) return;
  if (event.clipboardData.items[0] == null) return;
  if (event.clipboardData.items[0].type.indexOf("image") === -1) return;
  if (textureArea.mode !== "paint") return;

  if (textureArea.pasteMesh != null) {
    textureArea.gameInstance.threeScene.remove(textureArea.pasteMesh);
    textureArea.pasteMesh = null;
  }

  let imageBlob = (<any>event.clipboardData.items[0]).getAsFile();
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
    textureArea.pasteMesh.position.set(image.width / 2, -image.height / 2, 1);
    textureArea.gameInstance.threeScene.add(textureArea.pasteMesh);
    textureArea.pasteMesh.updateMatrixWorld(false);
  }
})

textureArea.gameInstance = new SupEngine.GameInstance(canvas);
textureArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(textureArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
cameraComponent.setOrthographicMode(true);
cameraComponent.setOrthographicScale(10);
textureArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 200 });


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
document.querySelector(".texture-container .controls .mode-selection").addEventListener("click", (event) => {
  let target = <HTMLInputElement>event.target;
  if (target.tagName !== "INPUT") return;

  textureArea.mode = target.value;
  updateMode();
});

textureArea.paintTool = "brush";
document.querySelector(".texture-container .controls .paint-mode-container .tool").addEventListener("click", (event) => {
  let target = <HTMLInputElement>event.target;
  if (target.tagName !== "INPUT") return;

  textureArea.paintTool = target.value;
});

function updateMode() {
  for (let mode of ["layout", "paint"]) {
    let container = <HTMLDivElement>document.querySelector(`.${mode}-mode-container`);
    container.style.display = mode === textureArea.mode ? "" : "none";
  }
}

textureArea.colorInput = <HTMLInputElement>document.querySelector("input.color");
const lineMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, opacity: 0.4, depthTest: false, depthWrite: false, transparent: true })
const selectedLineMaterial = new THREE.LineBasicMaterial({ color: 0xff00ff, opacity: 1, depthTest: false, depthWrite: false, transparent: true })
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
  let vertices = (<THREE.Geometry>line.geometry).vertices;

  if (vertices.length < verticesCount) {
    for (let i = vertices.length; i < verticesCount; i++) vertices.push(new THREE.Vector3(0, 0, 0));
  } else if (vertices.length > verticesCount) {
    vertices.length = verticesCount;
  }

  let origin = { x: node.shape.textureOffset.x, y: -node.shape.textureOffset.y };

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

  (<THREE.Geometry>line.geometry).verticesNeedUpdate = true;
}

export function removeNode(nodeId: string) {
  let line = textureArea.shapeLineMeshesByNodeId[nodeId];
  line.parent.remove(line);
  line.geometry.dispose();

  delete textureArea.shapeLineMeshesByNodeId[nodeId];
}

let selectedNodeLineMesh: THREE.LineSegments;
export function setSelectedNode(node: Node) {
  if (selectedNodeLineMesh != null) selectedNodeLineMesh.material = lineMaterial;

  selectedNodeLineMesh = (node != null) ? textureArea.shapeLineMeshesByNodeId[node.id] : null;
  if (selectedNodeLineMesh != null) selectedNodeLineMesh.material = selectedLineMaterial;
}

let mousePosition = new THREE.Vector3();
let cameraPosition = new THREE.Vector3();

let isDrawing = false;
let isDragging = false;
let dragOffset = new THREE.Vector3();

export function handleTextureArea() {
  let inputs = textureArea.gameInstance.input;

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

  if (!inputs.mouseButtons[0].isDown) isDragging = false;

  if (textureArea.mode === "layout") {
    if (ui.nodesTreeView.selectedNodes.length !== 1) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
    let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[nodeId];
    if (isDragging) {
      let textureOffset = node.shape.textureOffset;
      let x = mousePosition.x + dragOffset.x;
      let y = mousePosition.y + dragOffset.y;
      if (textureOffset.x !== x || textureOffset.y !== y)
        editAsset("setNodeProperty", nodeId, `shape.textureOffset`, { x, y });

    } else if (inputs.mouseButtons[0].wasJustPressed) {
      isDragging = true;
      let textureOffset = node.shape.textureOffset;
      dragOffset.set(textureOffset.x - mousePosition.x, textureOffset.y - mousePosition.y, 0);
    }

  } else if (textureArea.mode === "paint") {
    // Paste element
    if (textureArea.pasteMesh != null) {
      if (isDragging) {
        textureArea.pasteMesh.position.x = mousePosition.x + dragOffset.x;
        textureArea.pasteMesh.position.y = -mousePosition.y + dragOffset.y;
        textureArea.pasteMesh.updateMatrixWorld(false);
        return;
      }

      let keys = (<any>window).KeyEvent;
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
        let position = textureArea.pasteMesh.position;
        let width = pasteCtx.canvas.width;
        let height = pasteCtx.canvas.height;
        if (mousePosition.x > position.x - width  / 2 &&  mousePosition.x < position.x + width  / 2 &&
          -mousePosition.y > position.y - height / 2 && -mousePosition.y < position.y + height / 2) {
          isDragging = true;
          dragOffset.set(position.x - mousePosition.x, position.y + mousePosition.y, 0);
          return;
        }

        let imageData = pasteCtx.getImageData(0, 0, width, height).data;
        let edits: TextureEdit[] = [];

        let startX = textureArea.pasteMesh.position.x - width / 2;
        let startY = -textureArea.pasteMesh.position.y - height / 2;

        for (let i = 0; i < width; i++) {
          for (let j = 0; j < height; j++) {
            let index = j * width + i;
            index *= 4;
            let x = startX + i;
            if (x < 0 || x >= data.cubicModelUpdater.cubicModelAsset.pub.textureWidth) continue;
            let y = startY + j;
            if (y < 0 || y >= data.cubicModelUpdater.cubicModelAsset.pub.textureHeight) continue;

            edits.push({ x, y, value: { r: imageData[index], g: imageData[index + 1], b: imageData[index + 2], a: imageData[index + 3] } })
          }
        }
        editAsset("editTexture", "map", edits);

        textureArea.gameInstance.threeScene.remove(textureArea.pasteMesh);
        textureArea.pasteMesh = null;
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

      if (textureData[index + 0] !== brush.r || textureData[index + 1] !== brush.g || textureData[index + 2] !== brush.b ||textureData[index + 3] !== brush.a) {
        let edits: TextureEdit[] = [];
        edits.push({ x: mousePosition.x, y: mousePosition.y, value: brush });
        editAsset("editTexture", mapName, edits)
      }
    }
  }
}
