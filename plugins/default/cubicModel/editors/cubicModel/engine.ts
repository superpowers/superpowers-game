import { data } from "./network";
import ui, { setupSelectedNode } from "./ui";
import textureArea, { handleTextureArea } from "./textureArea";

const THREE = SupEngine.THREE;

const engine: {
  gameInstance: SupEngine.GameInstance;

  cameraActor: SupEngine.Actor;

  transformMarkerComponent: TransformMarker;
  selectionBoxComponent: SelectionBox;
  transformHandleComponent: TransformHandle;
  gridHelperComponent: GridHelper;
} = <any>{};
export default engine;

const canvasElt = document.querySelector("canvas") as HTMLCanvasElement;

engine.gameInstance = new SupEngine.GameInstance(canvasElt);
engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));

const cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
cameraComponent.layers = [ 0, -1 ];
new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, cameraComponent);

const markerActor = new SupEngine.Actor(engine.gameInstance, "Marker", null, { layer: -1 });
engine.transformMarkerComponent = new SupEngine.editorComponentClasses["TransformMarker"](markerActor);
engine.transformMarkerComponent.hide();

const selectionActor = new SupEngine.Actor(engine.gameInstance, "Selection Box", null, { layer: -1 });
engine.selectionBoxComponent = new SupEngine.editorComponentClasses["SelectionBox"](selectionActor);

const transformHandlesActor = new SupEngine.Actor(engine.gameInstance, "Transform Handles", null, { layer: -1 });
engine.transformHandleComponent = new SupEngine.editorComponentClasses["TransformHandle"](transformHandlesActor, cameraComponent.unifiedThreeCamera);

const gridActor = new SupEngine.Actor(engine.gameInstance, "Grid", null, { layer: 0 });

/*let light = new THREE.AmbientLight(0xcfcfcf);
engine.gameInstance.threeScene.add(light);*/

export function start() {
  // We need to delay this because it relies on ui.grid* being setup
  engine.gridHelperComponent = new SupEngine.editorComponentClasses["GridHelper"](gridActor, ui.gridSize, ui.gridStep);
  engine.gridHelperComponent.setVisible(false);
}

let isTabActive = true;
let animationFrame: number;

window.addEventListener("message", (event) => {
  if (event.data.type === "deactivate" || event.data.type === "activate") {
    isTabActive = event.data.type === "activate";
    onChangeActive();
  }
});

function onChangeActive() {
  const stopRendering = !isTabActive;

  if (stopRendering) {
    if (animationFrame != null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  } else if (animationFrame == null) {
    animationFrame = requestAnimationFrame(tick);
  }
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
  animationFrame = requestAnimationFrame(tick);
}
animationFrame = requestAnimationFrame(tick);

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
    const localElt = (<HTMLInputElement>document.getElementById(`transform-space`));
    localElt.checked = !localElt.checked;
    engine.transformHandleComponent.setSpace(localElt.checked ? "local" : "world");
  }

  const snap = engine.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_CONTROL].isDown;

  if (snap !== (engine.transformHandleComponent.control.translationSnap != null)) {
    engine.transformHandleComponent.control.setTranslationSnap(snap ? ui.gridStep : null);
    engine.transformHandleComponent.control.setRotationSnap(snap ? Math.PI / 36 : null);
  }
}

// Mouse picking
const mousePosition = new THREE.Vector2;
const raycaster = new THREE.Raycaster;

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

  const intersects = raycaster.intersectObject(engine.gameInstance.threeScene, true);
  if (intersects.length > 0) {
    for (const intersect of intersects) {
      let threeObject = intersect.object;

      while (threeObject != null) {
        if (threeObject.userData.cubicNodeId != null) break;
        threeObject = threeObject.parent;
      }

      if (threeObject != null) {
        selectedNodeId = threeObject.userData.cubicNodeId;

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
  const nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt != null && ui.nodesTreeView.selectedNodes.length === 1) {
    const { pivot, shape } = data.cubicModelUpdater.cubicModelRenderer.byNodeId[nodeElt.dataset["id"]];

    engine.transformMarkerComponent.move(pivot);
    engine.selectionBoxComponent.setTarget(shape);

    const mode = engine.transformHandleComponent.mode;
    const handleTarget = (mode === "rotate" || (mode === "translate" && ui.translateMode !== "shape")) ? pivot : shape;
    engine.transformHandleComponent.setTarget(handleTarget);
  } else {
    engine.transformMarkerComponent.hide();
    engine.selectionBoxComponent.setTarget(null);
    engine.transformHandleComponent.setTarget(null);
  }
}

function onTransformChange() {
  const nodeElt = ui.nodesTreeView.selectedNodes[0];
  const nodeId = nodeElt.dataset["id"];
  const { pivot, shape } = data.cubicModelUpdater.cubicModelRenderer.byNodeId[nodeElt.dataset["id"]];

  const transformMode = engine.transformHandleComponent.mode;
  let target = (transformMode === "rotate" || (transformMode === "translate" && ui.translateMode !== "shape")) ? pivot : shape;

  const object = <THREE.Object3D>engine.transformHandleComponent.control.object;
  let transformType: string;
  let value: any;

  switch (engine.transformHandleComponent.mode) {
    case "translate":
      switch (ui.translateMode) {
        case "all": transformType = "position"; break;
        case "shape": transformType = "shape.offset"; break;
        case "pivot": transformType = "pivotPosition"; break;
      }

      const position = object.getWorldPosition();
      const parent = target.parent;
      const pixelsPerUnit = data.cubicModelUpdater.cubicModelAsset.pub.pixelsPerUnit;

      /*if (ui.translateMode === "all") {
        position.sub(target.getWorldPosition().sub(parent.getWorldPosition()));
        parent = parent.parent;
      }*/

      if (parent.userData.cubicNodeId != null) {
        const inverseParentMatrix = parent.matrixWorld.clone();
        inverseParentMatrix.getInverse(inverseParentMatrix);
        position.applyMatrix4(inverseParentMatrix);

        if (ui.translateMode !== "shape") {
          const parentOffset = data.cubicModelUpdater.cubicModelAsset.nodes.byId[parent.userData.cubicNodeId].shape.offset;
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

      const orientation = object.getWorldQuaternion();
      if (target.parent != null) {
        const q = target.parent.getWorldQuaternion().inverse();
        orientation.multiply(q);
      }
      value = { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w };
      break;

    case "scale":
      transformType = "shape.settings.stretch";
      value = { x: object.scale.x, y: object.scale.y, z: object.scale.z };
      break;
  }

  if (transformType !== "pivotPosition") data.projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, transformType, value);
  else data.projectClient.editAsset(SupClient.query.asset, "moveNodePivot", nodeId, value);
}
