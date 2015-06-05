import { data } from "./network";
import ui, { setupSelectedNode } from "./ui";

let THREE = SupEngine.THREE;
import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";

let engine: {
  gameInstance?: SupEngine.GameInstance;

  cameraActor?: SupEngine.Actor;
  cameraComponent?: any;
  cameraControls?: any;

  selectionBoxActor?: SupEngine.Actor;
  selectionBoxComponent?: any;

  tickAnimationFrameId?: number;
} = {};
export default engine;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");

engine.gameInstance = new SupEngine.GameInstance(canvasElt);
engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));

engine.cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
engine.cameraComponent.layers = [ 0, -1 ];
engine.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, engine.cameraComponent);

engine.selectionBoxActor = new SupEngine.Actor(engine.gameInstance, "Selection Box");
engine.selectionBoxActor.layer = -1;
engine.selectionBoxComponent = new SupEngine.editorComponentClasses["SelectionBox"](engine.selectionBoxActor);

engine.tickAnimationFrameId = requestAnimationFrame(tick);

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp=0) {
  engine.tickAnimationFrameId = requestAnimationFrame(tick);

  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) {
    if (ui.cameraMode === "3D" && engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_CONTROL].isDown) {
      if (engine.gameInstance.input.mouseButtons[5].isDown) {
        ui.cameraSpeedSlider.value = (parseFloat(ui.cameraSpeedSlider.value) + 2 * parseFloat(ui.cameraSpeedSlider.step)).toString();
        engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
      } else if (engine.gameInstance.input.mouseButtons[6].isDown) {
        ui.cameraSpeedSlider.value = (parseFloat(ui.cameraSpeedSlider.value) - 2 * parseFloat(ui.cameraSpeedSlider.step)).toString();
        engine.cameraControls.movementSpeed = ui.cameraSpeedSlider.value;
      }
    }

    engine.gameInstance.draw();
  }
}

canvasElt.addEventListener("mouseup", onMouseUp);

// Mouse picking
let mousePosition = new THREE.Vector2;
let raycaster = new THREE.Raycaster;

function onMouseUp(event: MouseEvent) {
  if (event.button !== 0) return;

  let rect = canvasElt.getBoundingClientRect();
  mousePosition.set(
    (( event.clientX - rect.left ) / rect.width * 2) - 1,
    -(( event.clientY - rect.top ) / rect.height * 2) + 1
  );

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

  if (selectedNodeId != null) {
    engine.selectionBoxComponent.setTarget(data.sceneUpdater.bySceneNodeId[selectedNodeId].actor);
  } else {
    engine.selectionBoxComponent.setTarget(null);
  }

  setupSelectedNode();
}
