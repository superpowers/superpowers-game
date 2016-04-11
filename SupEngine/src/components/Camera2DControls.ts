import * as THREE from "three";
import ActorComponent from "../ActorComponent";
import Actor from "../Actor";
import Camera from "./Camera";

let tmpVector3 = new THREE.Vector3();

interface Options {
  zoomMin: number;
  zoomMax: number;
  zoomSpeed: number;
}

export default class Camera2DControls extends ActorComponent {
  actor: Actor;
  camera: Camera;
  options: Options;
  zoomCallback: Function;
  multiplier = 1;

  constructor(actor: Actor, camera: Camera, options: Options, zoomCallback?: Function) {
    super(actor, "Camera2DControls");

    this.actor = actor;
    this.camera = camera;
    this.options = options;
    this.zoomCallback = zoomCallback;
  }

  setIsLayerActive(active: boolean) { /* Nothing to render */ }

  setMultiplier(newMultiplier: number) {
    let newOrthographicScale = this.camera.orthographicScale * this.multiplier;
    this.multiplier = newMultiplier / 10;

    this.camera.actor.getLocalPosition(tmpVector3);
    let screenPosition = this.getScreenPosition(tmpVector3.x, tmpVector3.y);
    this.changeOrthographicScale(newOrthographicScale, screenPosition[0], screenPosition[1]);
  }

  changeOrthographicScale(newOrthographicScale: number, x: number, y: number) {
    let startPosition = this.getScenePosition(x, y);
    this.camera.setOrthographicScale(newOrthographicScale / this.multiplier);
    let endPosition = this.getScenePosition(x, y);

    this.camera.actor.moveLocal(new THREE.Vector3(startPosition[0] - endPosition[0], endPosition[1] - startPosition[1], 0));
    if (this.zoomCallback != null) this.zoomCallback();
  }

  update() {
    let input = this.actor.gameInstance.input;
    let keys = (<any>window).KeyEvent;

    // Move
    if (input.mouseButtons[1].isDown ||
    (input.mouseButtons[0].isDown && input.keyboardButtons[keys.DOM_VK_ALT].isDown)) {
      let mouseDelta = input.mouseDelta;
      mouseDelta.x /= this.actor.gameInstance.threeRenderer.domElement.width;
      mouseDelta.x *= this.camera.orthographicScale * this.camera.cachedRatio;

      mouseDelta.y /= this.actor.gameInstance.threeRenderer.domElement.height;
      mouseDelta.y *= this.camera.orthographicScale;

      if (mouseDelta.x !== 0 || mouseDelta.y !== 0) this.camera.actor.moveLocal(new THREE.Vector3(-mouseDelta.x, mouseDelta.y, 0));
    }

    // Zoom
    else {
      let mousePosition = input.mousePosition;
      let newOrthographicScale: number;
      if (input.mouseButtons[5].isDown || input.keyboardButtons[keys.DOM_VK_ADD].wasJustPressed) {
        newOrthographicScale = Math.max(this.options.zoomMin, this.camera.orthographicScale * this.multiplier / this.options.zoomSpeed);
        if (input.keyboardButtons[keys.DOM_VK_ADD].wasJustPressed) {
          mousePosition.x = this.actor.gameInstance.threeRenderer.domElement.width  / 2;
          mousePosition.y = this.actor.gameInstance.threeRenderer.domElement.height / 2;
        }

      } else if (input.mouseButtons[6].isDown || (input.keyboardButtons[keys.DOM_VK_SUBTRACT].wasJustPressed)) {
        newOrthographicScale = Math.min(this.options.zoomMax, this.camera.orthographicScale * this.multiplier * this.options.zoomSpeed);
        if (input.keyboardButtons[keys.DOM_VK_SUBTRACT].wasJustPressed) {
          mousePosition.x = this.actor.gameInstance.threeRenderer.domElement.width  / 2;
          mousePosition.y = this.actor.gameInstance.threeRenderer.domElement.height / 2;
        }
      }

      if (newOrthographicScale != null && newOrthographicScale !== this.camera.orthographicScale) {
        this.changeOrthographicScale(newOrthographicScale, mousePosition.x, mousePosition.y);
      }
    }
  }

  getScreenPosition(x: number, y: number): number[] {
    x /= this.camera.orthographicScale / 2 * this.camera.cachedRatio;
    x = (1 - x) / 2;
    x *= this.actor.gameInstance.threeRenderer.domElement.width;

    y /= this.camera.orthographicScale / 2;
    y = (y + 1) / 2;
    y *= this.actor.gameInstance.threeRenderer.domElement.height;
    return [x, y];
  }

  getScenePosition(x: number, y: number): number[]  {
    this.camera.actor.getLocalPosition(tmpVector3);

    x /= this.actor.gameInstance.threeRenderer.domElement.width;
    x = x * 2 - 1;
    x *= this.camera.orthographicScale / 2 * this.camera.cachedRatio;
    x += tmpVector3.x;

    y /= this.actor.gameInstance.threeRenderer.domElement.height;
    y = y * 2 - 1;
    y *= this.camera.orthographicScale / 2;
    y -= tmpVector3.y;
    return [x, y];
  }
}
