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

  tickAnimationFrameId?: number;
} = {};
export default engine;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");

engine.gameInstance = new SupEngine.GameInstance(canvasElt);
engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));

engine.cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
engine.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, engine.cameraComponent);

engine.tickAnimationFrameId = requestAnimationFrame(tick);
function tick() {
  // FIXME: decouple update interval from render interval
  engine.gameInstance.update();

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
  engine.tickAnimationFrameId = requestAnimationFrame(tick);
}

canvasElt.addEventListener("mouseup", onMouseUp);

// Mouse picking
let mousePosition = new THREE.Vector2;
let raycaster = new THREE.Raycaster;

function onMouseUp(event: MouseEvent) {
	let rect = canvasElt.getBoundingClientRect();
  mousePosition.set(
    (( event.clientX - rect.left ) / rect.width * 2) - 1,
    -(( event.clientY - rect.top ) / rect.height * 2) + 1
  );

	raycaster.setFromCamera(mousePosition, engine.cameraComponent.threeCamera);

  ui.nodesTreeView.clearSelection();

	let intersects = raycaster.intersectObject(engine.gameInstance.threeScene, true);
  if (intersects.length > 0) {
    let threeObject = intersects[0].object;

    while (threeObject != null) {
      if (threeObject.userData.nodeId != null) break;
      threeObject = threeObject.parent;
    }

    if (threeObject != null) {
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${threeObject.userData.nodeId}']`));
    }
  }

  setupSelectedNode();
}