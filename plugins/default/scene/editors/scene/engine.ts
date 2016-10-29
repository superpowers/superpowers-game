import { data } from "./network";
import ui, { setupSelectedNode } from "./ui";

const THREE = SupEngine.THREE;

const engine: {
  gameInstance: SupEngine.GameInstance;

  cameraRoot: SupEngine.Actor;
  cameraActor: SupEngine.Actor;
  cameraComponent: any;
  cameraControls: any;

  selectionBoxComponent: SelectionBox;
  transformHandleComponent: TransformHandle;
  gridHelperComponent: GridHelper;

  ambientLight: THREE.AmbientLight;
} = <any>{};
export default engine;

const canvasElt = document.querySelector("canvas") as HTMLCanvasElement;

engine.gameInstance = new SupEngine.GameInstance(canvasElt);
engine.cameraRoot = new SupEngine.Actor(engine.gameInstance, "Camera Root");
engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera", engine.cameraRoot);
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));

engine.cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
engine.cameraComponent.layers = [ 0, -1 ];
engine.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, engine.cameraComponent);

engine.ambientLight = new THREE.AmbientLight(0xcfcfcf);

const gridActor = new SupEngine.Actor(engine.gameInstance, "Grid", null, { layer: 0 });
const selectionActor = new SupEngine.Actor(engine.gameInstance, "Selection Box", null, { layer: -1 });
const transformHandlesActor = new SupEngine.Actor(engine.gameInstance, "Transform Handles", null, { layer: -1 });

let draggingControls = false;

let hasStarted = false;
let isTabActive = true;
let animationFrame: number;

window.addEventListener("message", (event) => {
  if (event.data.type === "deactivate" || event.data.type === "activate") {
    isTabActive = event.data.type === "activate";
    onChangeActive();
  }
});

function onChangeActive() {
  const stopRendering = !hasStarted || !isTabActive;

  if (stopRendering) {
    if (animationFrame != null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  } else if (animationFrame == null) {
    animationFrame = requestAnimationFrame(tick);
  }
}

export function start() {
  // Those classes are loaded asynchronously
  engine.selectionBoxComponent = new SupEngine.editorComponentClasses["SelectionBox"](selectionActor);
  engine.transformHandleComponent = new SupEngine.editorComponentClasses["TransformHandle"](transformHandlesActor, engine.cameraComponent.unifiedThreeCamera);

  engine.transformHandleComponent.control.addEventListener("mouseDown", () => { draggingControls = true; });
  engine.transformHandleComponent.control.addEventListener("objectChange", onTransformChange);

  engine.gridHelperComponent = new SupEngine.editorComponentClasses["GridHelper"](gridActor, ui.gridSize, ui.gridStep);
  engine.gridHelperComponent.setVisible(false);

  hasStarted = true;
  onChangeActive();
}

export function updateCameraMode() {
  if (ui.cameraMode === "3D") {
    engine.cameraComponent.setOrthographicMode(false);
    engine.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, engine.cameraComponent);
    engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
  } else {
    engine.cameraActor.setLocalOrientation(new SupEngine.THREE.Quaternion().setFromAxisAngle(new SupEngine.THREE.Vector3(0, 1, 0), 0));
    engine.cameraComponent.setOrthographicMode(true);
    engine.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](engine.cameraActor, engine.cameraComponent, {
      zoomSpeed: 1.5,
      zoomMin: 0.1,
      zoomMax: 10000,
    });
  }

  engine.transformHandleComponent.control.camera = engine.cameraComponent.threeCamera;

  if (ui.cameraMode === "3D") {
    gridActor.setLocalPosition(new THREE.Vector3(0, 0, 0));
    gridActor.setLocalEulerAngles(new THREE.Euler(0, 0, 0));
    gridActor.layer = 0;
  } else {
    gridActor.setLocalPosition(new THREE.Vector3(0, 0, -500));
    gridActor.setLocalEulerAngles(new THREE.Euler(Math.PI / 2, 0, 0));
    gridActor.layer = -1;
  }
}

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp = 0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  const { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime, update);
  accumulatedTime = timeLeft;

  if (updates > 0) engine.gameInstance.draw();
  animationFrame = requestAnimationFrame(tick);
}

const gridPosition = new THREE.Vector3();
function update() {
  if (ui.cameraMode === "3D" && engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_CONTROL].isDown) {
    if (engine.gameInstance.input.mouseButtons[5].isDown) {
      ui.cameraSpeedSlider.value = (parseFloat(ui.cameraSpeedSlider.value) + 2 * parseFloat(ui.cameraSpeedSlider.step)).toString();
      engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
    } else if (engine.gameInstance.input.mouseButtons[6].isDown) {
      ui.cameraSpeedSlider.value = (parseFloat(ui.cameraSpeedSlider.value) - 2 * parseFloat(ui.cameraSpeedSlider.step)).toString();
      engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
    }
  }

  if (engine.gameInstance.input.mouseButtons[0].wasJustReleased) mouseUp();

  const snap = engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_CONTROL].isDown;

  if (snap !== (engine.transformHandleComponent.control.translationSnap != null)) {
    engine.transformHandleComponent.control.setTranslationSnap(snap ? ui.gridStep : null);
    engine.transformHandleComponent.control.setRotationSnap(snap ? Math.PI / 36 : null);
  }

  if (ui.cameraMode === "2D") {
    engine.cameraActor.getLocalPosition(gridPosition);
    gridPosition.x -= gridPosition.x % ui.gridStep;
    gridPosition.y -= gridPosition.y % ui.gridStep;
    gridPosition.z = 0;
    gridActor.setLocalPosition(gridPosition);
  }
}

// Mouse picking
const mousePosition = new THREE.Vector2;
const raycaster = new THREE.Raycaster;

function mouseUp() {
  if (draggingControls) {
    draggingControls = false;
    return;
  }

  mousePosition.x =   engine.gameInstance.input.mousePosition.x / canvasElt.clientWidth * 2 - 1;
  mousePosition.y = -(engine.gameInstance.input.mousePosition.y / canvasElt.clientHeight * 2 - 1);

  raycaster.setFromCamera(mousePosition, engine.cameraComponent.threeCamera);

  let selectedNodeId: string = ui.nodesTreeView.selectedNodes.length > 0 ? ui.nodesTreeView.selectedNodes[0].dataset["id"] : null;
  ui.nodesTreeView.clearSelection();

  const intersects = raycaster.intersectObject(engine.gameInstance.threeScene, true);
  if (intersects.length > 0) {
    const hoveredNodeIds: string[] = [];

    for (const intersect of intersects) {
      let threeObject = intersect.object;
      while (threeObject != null) {
        if (threeObject.userData.nodeId != null) {
          if (hoveredNodeIds.indexOf(threeObject.userData.nodeId) === -1) hoveredNodeIds.push(threeObject.userData.nodeId);
          break;
        }
        threeObject = threeObject.parent;
      }
    }

    if (hoveredNodeIds.length > 0) {
      const hoveredNodeIdIndex = hoveredNodeIds.indexOf(selectedNodeId);
      if (selectedNodeId != null && hoveredNodeIdIndex !== -1 && hoveredNodeIdIndex !== hoveredNodeIds.length - 1)
        selectedNodeId = hoveredNodeIds[hoveredNodeIdIndex + 1];
      else
        selectedNodeId = hoveredNodeIds[0];

      const treeViewNode = ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${selectedNodeId}']`) as HTMLLIElement;
      ui.nodesTreeView.addToSelection(treeViewNode);

      let treeViewParent = treeViewNode.parentElement;
      while (treeViewParent !== ui.nodesTreeView.treeRoot) {
        if (treeViewParent.tagName === "OL") (<HTMLElement>treeViewParent.previousElementSibling).classList.remove("collapsed");
        treeViewParent = treeViewParent.parentElement;
      }

      ui.nodesTreeView.scrollIntoView(treeViewNode);
    }
  }
  setupSelectedNode();
  setupHelpers();

  if (engine.gameInstance.input.mouseButtons[0].doubleClicked) {
    focusActor(selectedNodeId);
    engine.gameInstance.input.mouseButtons[0].doubleClicked = false;
  }
}

export function focusActor(selectedNodeId: string) {
  const position = new THREE.Box3().setFromObject(data.sceneUpdater.bySceneNodeId[selectedNodeId].actor.threeObject).getCenter();
  if (ui.cameraMode === "2D") position.z = engine.cameraActor.getLocalPosition(new THREE.Vector3()).z;
  engine.cameraActor.setLocalPosition(position);
  if (ui.cameraMode === "3D") engine.cameraActor.moveOriented(new THREE.Vector3(0, 0, 20));
}

export function setupHelpers() {
  const nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt != null && ui.nodesTreeView.selectedNodes.length === 1) {
    engine.selectionBoxComponent.setTarget(data.sceneUpdater.bySceneNodeId[nodeElt.dataset["id"]].actor.threeObject);
    engine.transformHandleComponent.setTarget(data.sceneUpdater.bySceneNodeId[nodeElt.dataset["id"]].actor.threeObject);
  } else {
    engine.selectionBoxComponent.setTarget(null);
    engine.transformHandleComponent.setTarget(null);
  }
}

function onTransformChange() {
  const nodeElt = ui.nodesTreeView.selectedNodes[0];
  const nodeId = nodeElt.dataset["id"];
  const target = data.sceneUpdater.bySceneNodeId[nodeId].actor;

  const object = <THREE.Object3D>engine.transformHandleComponent.control.object;

  let transformType: string;
  let value: any;

  switch(engine.transformHandleComponent.mode) {
    case "translate": {
      transformType = "position";

      const position = object.getWorldPosition();
      if (target.parent != null) {
        const mtx = target.parent.getGlobalMatrix(new THREE.Matrix4());
        mtx.getInverse(mtx);
        position.applyMatrix4(mtx);
      }
      value = { x: position.x, y: position.y, z: position.z };
    } break;

    case "rotate": {
      transformType = "orientation";

      const orientation = object.getWorldQuaternion();
      if (target.parent != null) {
        const q = target.parent.getGlobalOrientation(new THREE.Quaternion()).inverse();
        orientation.multiply(q);
      }
      value = { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w };
    } break;

    case "scale": {
      transformType = "scale";
      value = { x: object.scale.x, y: object.scale.y, z: object.scale.z };
    } break;
  }

  data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, transformType, value);
}
