import info from "./info";
import { socket, data } from "./network";
import ui, { setupSelectedNode } from "./ui";

let THREE = SupEngine.THREE;
import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";

import SelectionBox from "../../components/SelectionBox";
import TransformHandle from "../../components/TransformHandle";

let engine: {
  gameInstance: SupEngine.GameInstance;

  cameraActor: SupEngine.Actor;
  cameraComponent: any;
  cameraControls: any;

  selectionActor: SupEngine.Actor;
  selectionBoxComponent: SelectionBox;
  transformHandleComponent: TransformHandle;
} = <any>{};
export default engine;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");

engine.gameInstance = new SupEngine.GameInstance(canvasElt);
engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 5));

engine.cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
engine.cameraComponent.layers = [ 0, -1 ];

engine.selectionActor = new SupEngine.Actor(engine.gameInstance, "Selection Box", null, { layer: -1 });
engine.selectionBoxComponent = new SelectionBox(engine.selectionActor);
engine.transformHandleComponent = new TransformHandle(engine.selectionActor, engine.cameraComponent.unifiedThreeCamera);

engine.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, engine.cameraComponent);

requestAnimationFrame(tick);

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp=0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime, update);
  accumulatedTime = timeLeft;

  if (updates > 0) engine.gameInstance.draw();
  requestAnimationFrame(tick);
}

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

  if (engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_E].wasJustPressed) {
    (<HTMLInputElement>document.getElementById(`transform-mode-translate`)).checked = true;
    engine.transformHandleComponent.setMode("translate");
  }

  if (engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_R].wasJustPressed) {
    (<HTMLInputElement>document.getElementById(`transform-mode-rotate`)).checked = true;
    engine.transformHandleComponent.setMode("rotate");
  }

  if (engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_T].wasJustPressed) {
    (<HTMLInputElement>document.getElementById(`transform-mode-scale`)).checked = true;
    engine.transformHandleComponent.setMode("scale");
  }

  if (engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_L].wasJustPressed) {
    let localElt = (<HTMLInputElement>document.getElementById(`transform-space`));
    localElt.checked = !localElt.checked;
    engine.transformHandleComponent.setSpace(localElt.checked ? "local" : "world");
  }

  engine.transformHandleComponent.control.snap = engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_CONTROL].isDown ? true : null;
}

// Mouse picking
let mousePosition = new THREE.Vector2;
let raycaster = new THREE.Raycaster;

let draggingControls = false;

engine.transformHandleComponent.control.addEventListener("mouseDown", () => {
  draggingControls = true;
});

engine.transformHandleComponent.control.addEventListener("objectChange", onTransformChange);

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

        let treeViewNode: HTMLLIElement = ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${selectedNodeId}']`);
        ui.nodesTreeView.addToSelection(treeViewNode);

        let treeViewParent = treeViewNode.parentElement;
        while (treeViewParent !== ui.nodesTreeView.treeRoot) {
          if (treeViewParent.tagName === "OL") (<HTMLElement>treeViewParent.previousElementSibling).classList.remove("collapsed");
          treeViewParent = treeViewParent.parentElement;
        }
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
    engine.selectionBoxComponent.setTarget(data.sceneUpdater.bySceneNodeId[nodeElt.dataset.id].actor);
    engine.transformHandleComponent.setTarget(data.sceneUpdater.bySceneNodeId[nodeElt.dataset.id].actor);
  } else {
    engine.selectionBoxComponent.setTarget(null);
    engine.transformHandleComponent.setTarget(null);
  }
}

function onTransformChange() {
  let nodeId = (<any>engine.transformHandleComponent.target).sceneNodeId;
  let target = <SupEngine.Actor>engine.transformHandleComponent.target;
  let object = <THREE.Object3D>engine.transformHandleComponent.control.object;

  let transformType: string;
  let value: any;

  switch(engine.transformHandleComponent.mode) {
    case "translate": {
      transformType = "position";

      let position = object.getWorldPosition();
      if (target.parent != null) {
        let mtx = target.parent.getGlobalMatrix();
        mtx.getInverse(mtx);
        position.applyMatrix4(mtx);
      }
      value = { x: position.x, y: position.y, z: position.z };
      break;
    }

    case "rotate": {
      transformType = "orientation";

      let orientation = object.getWorldQuaternion();
      if (target.parent != null) {
        let q = target.parent.getGlobalOrientation().inverse();
        orientation.multiply(q);
      }
      value = { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w };
      break;
    }

    case "scale": {
      transformType = "scale";
      value = { x: object.scale.x, y: object.scale.y, z: object.scale.z };
      break;
    }
  }

  socket.emit("edit:assets", info.assetId, "setNodeProperty", nodeId, transformType, value, onNodePropertySet);
}

function onNodePropertySet(err: string) {
  if (err != null) alert(err);
}
