import { data } from "./network";
import ui from "./ui";

let THREE = SupEngine.THREE;
import TransformMarker from "./TransformMarker";
import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";

let engine: {
  gameInstance?: SupEngine.GameInstance;

  cameraActor?: SupEngine.Actor;
  cameraComponent?: any;
  cameraControls?: any;

  bySceneNodeId?: { [id: string]: { actor: SupEngine.Actor, bySceneComponentId: { [id: string]: { component: any; componentUpdater: any } } } };

  tickAnimationFrameId?: number;
} = {};
export default engine;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");

engine.gameInstance = new SupEngine.GameInstance(canvasElt);
engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));

engine.cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
engine.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, engine.cameraComponent);

engine.bySceneNodeId = {};

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


export function createNodeActor(node: Node) {
  let parentNode = data.asset.nodes.parentNodesById[node.id]
  let parentActor: SupEngine.Actor;
  if (parentNode != null) parentActor = engine.bySceneNodeId[parentNode.id].actor

  let nodeActor = new SupEngine.Actor(engine.gameInstance, node.name, parentActor);
  nodeActor.threeObject.position.copy(<THREE.Vector3>node.position);
  nodeActor.threeObject.quaternion.copy(<THREE.Quaternion>node.orientation);
  nodeActor.threeObject.scale.copy(<THREE.Vector3>node.scale);
  nodeActor.threeObject.updateMatrixWorld(false);
  (<any>nodeActor).sceneNodeId = node.id;
  new TransformMarker(nodeActor);

  engine.bySceneNodeId[node.id] = { actor: nodeActor, bySceneComponentId: {} }

  for (let component of node.components) createNodeActorComponent(node, component, nodeActor);
  return nodeActor;
}

export function createNodeActorComponent(sceneNode: Node, sceneComponent: Component, nodeActor: SupEngine.Actor) {
  let componentClass = SupEngine.editorComponentClasses[`${sceneComponent.type}Marker`];
  if (componentClass == null) componentClass = SupEngine.componentClasses[sceneComponent.type];
  let actorComponent = new componentClass(nodeActor);

  engine.bySceneNodeId[sceneNode.id].bySceneComponentId[sceneComponent.id] = {
    component: actorComponent,
    componentUpdater: new componentClass.Updater(data.projectClient, actorComponent, sceneComponent.config),
  }
}
