import { socket, data } from "./network";
import ui, { setupSelectedNode } from "./ui";

let THREE = SupEngine.THREE;

let engine: {
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

let canvasElt = document.querySelector("canvas") as HTMLCanvasElement;

engine.gameInstance = new SupEngine.GameInstance(canvasElt);
engine.cameraRoot = new SupEngine.Actor(engine.gameInstance, "Camera Root");
engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera", engine.cameraRoot);
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));

engine.cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
engine.cameraComponent.layers = [ 0, -1 ];
engine.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, engine.cameraComponent);

engine.ambientLight = new THREE.AmbientLight(0xcfcfcf);

let gridActor = new SupEngine.Actor(engine.gameInstance, "Grid", null, { layer: 0 });
let selectionActor = new SupEngine.Actor(engine.gameInstance, "Selection Box", null, { layer: -1 });
let transformHandlesActor = new SupEngine.Actor(engine.gameInstance, "Transform Handles", null, { layer: -1 });

export function start() {
  // Those classes are loaded asynchronously
  engine.selectionBoxComponent = new SupEngine.editorComponentClasses["SelectionBox"](selectionActor);
  engine.transformHandleComponent = new SupEngine.editorComponentClasses["TransformHandle"](transformHandlesActor, engine.cameraComponent.unifiedThreeCamera);

  engine.transformHandleComponent.control.addEventListener("mouseDown", () => { draggingControls = true; });
  engine.transformHandleComponent.control.addEventListener("objectChange", onTransformChange);

  engine.gridHelperComponent = new SupEngine.editorComponentClasses["GridHelper"](gridActor, ui.gridSize, ui.gridStep);
  engine.gridHelperComponent.setVisible(false);

  requestAnimationFrame(tick);
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
  let { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime, update);
  accumulatedTime = timeLeft;

  if (updates > 0) engine.gameInstance.draw();
  requestAnimationFrame(tick);
}

let pos = new THREE.Vector3();
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

  let snap = engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_CONTROL].isDown;

  if (snap !== (engine.transformHandleComponent.control.translationSnap != null)) {
    engine.transformHandleComponent.control.setTranslationSnap(snap ? ui.gridStep : null);
    engine.transformHandleComponent.control.setRotationSnap(snap ? Math.PI / 36 : null);
  }

  if (ui.cameraMode === "2D") {
    engine.cameraActor.getLocalPosition(pos);
    pos.x += (ui.gridStep - pos.x % ui.gridStep);
    pos.y += (ui.gridStep - pos.y % ui.gridStep);
    pos.z = 0;
    gridActor.setLocalPosition(pos);
  }
}

// Mouse picking
let mousePosition = new THREE.Vector2;
let raycaster = new THREE.Raycaster;

var draggingControls = false;

function mouseUp() {
  if (draggingControls) {
    draggingControls = false;
    return;
  }

  mousePosition.x =   engine.gameInstance.input.mousePosition.x / canvasElt.clientWidth * 2 - 1;
  mousePosition.y = -(engine.gameInstance.input.mousePosition.y / canvasElt.clientHeight * 2 - 1);

  raycaster.setFromCamera(mousePosition, engine.cameraComponent.threeCamera);

  let selectedNodeId: string = null;
  ui.nodesTreeView.clearSelection();

  let intersects = raycaster.intersectObject(engine.gameInstance.threeScene, true);
  if (intersects.length > 0) {
    for (let intersect of intersects) {
      let threeObject = intersect.object;

      while (threeObject != null) {
        if (threeObject.userData.nodeId != null) break;
        threeObject = threeObject.parent;
      }

      if (threeObject != null) {
        selectedNodeId = threeObject.userData.nodeId;

        const treeViewNode = ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${selectedNodeId}']`) as HTMLLIElement;
        ui.nodesTreeView.addToSelection(treeViewNode);

        let treeViewParent = treeViewNode.parentElement;
        while (treeViewParent !== ui.nodesTreeView.treeRoot) {
          if (treeViewParent.tagName === "OL") (<HTMLElement>treeViewParent.previousElementSibling).classList.remove("collapsed");
          treeViewParent = treeViewParent.parentElement;
        }

        ui.nodesTreeView.scrollIntoView(treeViewNode);
        break;
      }
    }
  }

  setupSelectedNode();
  setupHelpers();
}

export function setupHelpers() {
  let nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt != null && ui.nodesTreeView.selectedNodes.length === 1) {
    engine.selectionBoxComponent.setTarget(data.sceneUpdater.bySceneNodeId[nodeElt.dataset["id"]].actor.threeObject);
    engine.transformHandleComponent.setTarget(data.sceneUpdater.bySceneNodeId[nodeElt.dataset["id"]].actor.threeObject);
  } else {
    engine.selectionBoxComponent.setTarget(null);
    engine.transformHandleComponent.setTarget(null);
  }
}

function onTransformChange() {
  let nodeElt = ui.nodesTreeView.selectedNodes[0];
  let nodeId = nodeElt.dataset["id"];
  let target = data.sceneUpdater.bySceneNodeId[nodeId].actor;

  let object = <THREE.Object3D>engine.transformHandleComponent.control.object;

  let transformType: string;
  let value: any;

  switch(engine.transformHandleComponent.mode) {
    case "translate": {
      transformType = "position";

      let position = object.getWorldPosition();
      if (target.parent != null) {
        let mtx = target.parent.getGlobalMatrix(new THREE.Matrix4());
        mtx.getInverse(mtx);
        position.applyMatrix4(mtx);
      }
      value = { x: position.x, y: position.y, z: position.z };
    } break;

    case "rotate": {
      transformType = "orientation";

      let orientation = object.getWorldQuaternion();
      if (target.parent != null) {
        let q = target.parent.getGlobalOrientation(new THREE.Quaternion()).inverse();
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
