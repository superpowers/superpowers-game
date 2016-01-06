import { socket, data } from "./network";
import ui, { setupSelectedNode } from "./ui";
import textureArea, { handleTextureArea } from "./textureArea";

let THREE = SupEngine.THREE;

let engine: {
  gameInstance: SupEngine.GameInstance;

  cameraActor: SupEngine.Actor;

  transformMarkerComponent: TransformMarker;
  selectionBoxComponent: SelectionBox;
  transformHandleComponent: TransformHandle;
  gridHelperComponent: GridHelper;
} = <any>{};
export default engine;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");

engine.gameInstance = new SupEngine.GameInstance(canvasElt);
engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));

let cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
cameraComponent.layers = [ 0, -1 ];
/* tslint:disable:no-unused-expression */
new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, cameraComponent);
/* tslint:enable:no-unused-expression */

let markerActor = new SupEngine.Actor(engine.gameInstance, "Marker", null, { layer: -1 });
engine.transformMarkerComponent = new SupEngine.editorComponentClasses["TransformMarker"](markerActor);
engine.transformMarkerComponent.hide();

let selectionActor = new SupEngine.Actor(engine.gameInstance, "Selection Box", null, { layer: -1 });
engine.selectionBoxComponent = new SupEngine.editorComponentClasses["SelectionBox"](selectionActor);

let transformHandlesActor = new SupEngine.Actor(engine.gameInstance, "Transform Handles", null, { layer: -1 });
engine.transformHandleComponent = new SupEngine.editorComponentClasses["TransformHandle"](transformHandlesActor, cameraComponent.unifiedThreeCamera);

let gridActor = new SupEngine.Actor(engine.gameInstance, "Grid", null, { layer: 0 });

/*let light = new THREE.AmbientLight(0xcfcfcf);
engine.gameInstance.threeScene.add(light);*/

export function start() {
  // We need to delay this because it relies on ui.grid* being setup
  engine.gridHelperComponent = new SupEngine.editorComponentClasses["GridHelper"](gridActor, ui.gridSize, ui.gridStep);
  engine.gridHelperComponent.setVisible(false);
}

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp = 0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime, update);
  accumulatedTime = timeLeft;

  if (updates > 0) {
    for (let i = 0; i < updates; i++) {
      textureArea.gameInstance.update();
      handleTextureArea();
    }

    engine.gameInstance.draw();
    textureArea.gameInstance.draw();
  }
  requestAnimationFrame(tick);

}
requestAnimationFrame(tick);

function update() {
  if (engine.gameInstance.input.mouseButtons[0].wasJustReleased) mouseUp();

  if (engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_E].wasJustPressed) {
    // TODO: switch between pivot or shape
    (<HTMLInputElement>document.getElementById(`transform-mode-translate-pivot`)).checked = true;
    engine.transformHandleComponent.setMode("translate");
  }

  if (engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_R].wasJustPressed) {
    (<HTMLInputElement>document.getElementById(`transform-mode-rotate`)).checked = true;
    engine.transformHandleComponent.setMode("rotate");
  }

  if (engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_T].wasJustPressed) {
    (<HTMLInputElement>document.getElementById(`transform-mode-stretch`)).checked = true;
    engine.transformHandleComponent.setMode("scale");
  }

  if (engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_L].wasJustPressed) {
    let localElt = (<HTMLInputElement>document.getElementById(`transform-space`));
    localElt.checked = !localElt.checked;
    engine.transformHandleComponent.setSpace(localElt.checked ? "local" : "world");
  }

  let snap = engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_CONTROL].isDown;

  if (snap !== (engine.transformHandleComponent.control.translationSnap != null)) {
    engine.transformHandleComponent.control.setTranslationSnap(snap ? ui.gridStep : null);
    engine.transformHandleComponent.control.setRotationSnap(snap ? Math.PI / 36 : null);
  }
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

  raycaster.setFromCamera(mousePosition, cameraComponent.threeCamera);

  let selectedNodeId: string = null;
  ui.nodesTreeView.clearSelection();

  let intersects = raycaster.intersectObject(engine.gameInstance.threeScene, true);
  if (intersects.length > 0) {
    for (let intersect of intersects) {
      let threeObject = intersect.object;

      while (threeObject != null) {
        if (threeObject.userData.cubicNodeId != null) break;
        threeObject = threeObject.parent;
      }

      if (threeObject != null) {
        selectedNodeId = threeObject.userData.cubicNodeId;

        let treeViewNode: HTMLLIElement = ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${selectedNodeId}']`);
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
    let { pivot, shape } = data.cubicModelUpdater.cubicModelRenderer.byNodeId[nodeElt.dataset.id];

    engine.transformMarkerComponent.move(pivot);
    engine.selectionBoxComponent.setTarget(shape);

    let mode = engine.transformHandleComponent.mode;
    let handleTarget = (mode === "rotate" || (mode === "translate" && ui.translateMode !== "shape")) ? pivot : shape;
    engine.transformHandleComponent.setTarget(handleTarget);
  } else {
    engine.transformMarkerComponent.hide();
    engine.selectionBoxComponent.setTarget(null);
    engine.transformHandleComponent.setTarget(null);
  }
}

function onTransformChange() {
  let nodeElt = ui.nodesTreeView.selectedNodes[0];
  let nodeId = nodeElt.dataset.id;
  let { pivot, shape } = data.cubicModelUpdater.cubicModelRenderer.byNodeId[nodeElt.dataset.id];

  let transformMode = engine.transformHandleComponent.mode;
  let target = (transformMode === "rotate" || (transformMode === "translate" && ui.translateMode !== "shape")) ? pivot : shape;

  let object = <THREE.Object3D>engine.transformHandleComponent.control.object;
  let transformType: string;
  let value: any;

  switch(engine.transformHandleComponent.mode) {
    case "translate":
      switch (ui.translateMode) {
        case "all": transformType = "position"; break;
        case "shape": transformType = "shape.offset"; break;
        case "pivot": transformType = "pivotPosition"; break;
      }

      let position = object.getWorldPosition();
      let parent = target.parent;
      let pixelsPerUnit = data.cubicModelUpdater.cubicModelAsset.pub.pixelsPerUnit;

      /*if (ui.translateMode === "all") {
        position.sub(target.getWorldPosition().sub(parent.getWorldPosition()));
        parent = parent.parent;
      }*/

      if (parent.userData.cubicNodeId != null) {
        let inverseParentMatrix = parent.matrixWorld.clone();
        inverseParentMatrix.getInverse(inverseParentMatrix);
        position.applyMatrix4(inverseParentMatrix);

        if (ui.translateMode !== "shape") {
          let parentOffset = data.cubicModelUpdater.cubicModelAsset.nodes.byId[parent.userData.cubicNodeId].shape.offset;
          position.x -= parentOffset.x;
          position.y -= parentOffset.y;
          position.z -= parentOffset.z;
        }

        position.multiplyScalar(1 / pixelsPerUnit);
      }

      value = { x: position.x * pixelsPerUnit, y: position.y * pixelsPerUnit, z: position.z * pixelsPerUnit };
      break;

    case "rotate":
      if (ui.translateMode === "pivot") target = pivot;

      transformType = "orientation";

      let orientation = object.getWorldQuaternion();
      if (target.parent != null) {
        let q = target.parent.getWorldQuaternion().inverse();
        orientation.multiply(q);
      }
      value = { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w };
      break;

    case "scale":
      transformType = "scale";
      value = { x: object.scale.x, y: object.scale.y, z: object.scale.z };
      break;
  }

  if (transformType !== "pivotPosition") {
    socket.emit("edit:assets", SupClient.query.asset, "setNodeProperty", nodeId, transformType, value, (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
  } else {
    socket.emit("edit:assets", SupClient.query.asset, "moveNodePivot", nodeId, value, (err: string) => { if (err != null) new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); });
  }
}
