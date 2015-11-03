import { data, editAsset } from "./network";
import { Node } from "../../data/CubicModelNodes";
import { TextureEdit } from "../../data/CubicModelAsset";

let THREE = SupEngine.THREE;

let textureArea: {
  gameInstance?: SupEngine.GameInstance;
  cameraControls?: any;
  textureMesh?: THREE.Mesh;
  shapeLineMeshesByNodeId: { [nodeId: string]: THREE.LineSegments; }
  //gridRenderer?: any;
  //selectionRenderer?: SelectionRenderer;
} = {
  shapeLineMeshesByNodeId: {}
};
export default textureArea;

textureArea.gameInstance = new SupEngine.GameInstance(<HTMLCanvasElement>document.querySelector(".texture-container canvas"));
textureArea.gameInstance.threeRenderer.setClearColor(0xbbbbbb);

let cameraActor = new SupEngine.Actor(textureArea.gameInstance, "Camera");
cameraActor.setLocalPosition(new SupEngine.THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
cameraComponent.setOrthographicMode(true);
cameraComponent.setOrthographicScale(10);
textureArea.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](cameraActor, cameraComponent,
  { zoomSpeed: 1.5, zoomMin: 1, zoomMax: 200 });

export function setup() {
  let asset = data.cubicModelUpdater.cubicModelAsset;
  let threeTexture = data.cubicModelUpdater.cubicModelAsset.pub.textures["map"];

  let geom = new THREE.PlaneBufferGeometry(asset.pub.textureWidth, asset.pub.textureHeight, 1, 1);
  let mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
  mat.map = threeTexture;
  let mesh = new THREE.Mesh(geom, mat);
  mesh.position.set(asset.pub.textureWidth / 2, -asset.pub.textureHeight / 2, 0);

  textureArea.gameInstance.threeScene.add(mesh);
  mesh.updateMatrixWorld(false);

  data.cubicModelUpdater.cubicModelAsset.nodes.walk(addNode);
}

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

let cameraPosition = new THREE.Vector3();
export function handleTextureArea() {
  if (textureArea.gameInstance.input.mouseButtons[0].isDown || textureArea.gameInstance.input.mouseButtons[2].isDown) {
    let brush = { r: 0, g: 0, b: 0, a: 0 };
    if (textureArea.gameInstance.input.mouseButtons[0].isDown) {
      brush.r = 255;
      brush.a = 255;
    }

    let mousePosition = textureArea.gameInstance.input.mousePosition;
    let position = new SupEngine.THREE.Vector3(mousePosition.x, mousePosition.y, 0);
    cameraComponent.actor.getLocalPosition(cameraPosition);

    let x = position.x / textureArea.gameInstance.threeRenderer.domElement.width;
    x = x * 2 - 1;
    x *= cameraComponent.orthographicScale / 2 * cameraComponent.cachedRatio;
    x += cameraPosition.x;
    x = Math.floor(x);

    let y = position.y / textureArea.gameInstance.threeRenderer.domElement.height;
    y = y * 2 - 1;
    y *= cameraComponent.orthographicScale / 2;
    y -= cameraPosition.y;
    y = Math.floor(y);

    if (x < 0 || x >= data.cubicModelUpdater.cubicModelAsset.pub.textureWidth) return;
    if (y < 0 || y >= data.cubicModelUpdater.cubicModelAsset.pub.textureHeight) return;

    let mapName = "map";
    let array = data.cubicModelUpdater.cubicModelAsset.textureDatas[mapName];
    let index = y * data.cubicModelUpdater.cubicModelAsset.pub.textureWidth + x;
    index *= 4;

    if (array[index + 0] !== brush.r || array[index + 1] !== brush.g || array[index + 2] !== brush.b ||array[index + 3] !== brush.a) {
      let edits: TextureEdit[] = [];
      edits.push({ x, y, value: brush });
      editAsset("editTexture", mapName, edits)
    }
  }
}
