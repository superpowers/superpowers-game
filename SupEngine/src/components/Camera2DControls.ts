import * as THREE from "three";
import ActorComponent from "../ActorComponent";
import Actor from "../Actor";
import Camera from "./Camera";

interface options {
  zoomMin: number;
  zoomMax: number;
  zoomSpeed: number;
}

export default class Camera2DControls extends ActorComponent {
  actor: Actor;
  camera: Camera;
  options: options;
  zoomCallback: Function;
  multiplier = 1;

  constructor(actor: Actor, camera: Camera, options: options, zoomCallback?: Function) {
    super(actor, "Camera2DControls");

    this.actor = actor;
    this.camera = camera;
    this.options = options;
    this.zoomCallback = zoomCallback;
  }

  setMultiplier(newMultiplier: number) {
    let newOrthographicScale = this.camera.orthographicScale * this.multiplier;
    this.multiplier = newMultiplier / 10;

    let cameraPosition = this.camera.actor.getLocalPosition();
    let screenPosition = this.getScreenPosition(cameraPosition.x, cameraPosition.y);
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
    // Zoom
    let newOrthographicScale: number;
    if (this.actor.gameInstance.input.mouseButtons[5].isDown) {
      newOrthographicScale = Math.max(this.options.zoomMin, this.camera.orthographicScale * this.multiplier / this.options.zoomSpeed);
    }

    if (this.actor.gameInstance.input.mouseButtons[6].isDown) {
      newOrthographicScale = Math.min(this.options.zoomMax, this.camera.orthographicScale * this.multiplier * this.options.zoomSpeed);
    }

    if (newOrthographicScale != null && newOrthographicScale !== this.camera.orthographicScale) {
      let mousePosition = this.actor.gameInstance.input.mousePosition;
      this.changeOrthographicScale(newOrthographicScale, mousePosition.x, mousePosition.y);
    }

    // Move
    if (this.actor.gameInstance.input.mouseButtons[1].isDown ||
    (this.actor.gameInstance.input.mouseButtons[0].isDown && this.actor.gameInstance.input.keyboardButtons[(<any>window).KeyEvent.DOM_VK_ALT].isDown)) {
      let mouseDelta = this.actor.gameInstance.input.mouseDelta;
      mouseDelta.x /= this.actor.gameInstance.threeRenderer.domElement.width;
      mouseDelta.x *= this.camera.orthographicScale * this.camera.cachedRatio;

      mouseDelta.y /= this.actor.gameInstance.threeRenderer.domElement.height;
      mouseDelta.y *= this.camera.orthographicScale;

      if (mouseDelta.x !== 0 || mouseDelta.y !== 0) this.camera.actor.moveLocal(new THREE.Vector3(-mouseDelta.x, mouseDelta.y, 0));
    }
  }

  getScreenPosition(x: number, y: number): number[] {
    x /= this.camera.orthographicScale / 2 * this.camera.cachedRatio;
    x = (1-x) / 2;
    x *= this.actor.gameInstance.threeRenderer.domElement.width;

    y /= this.camera.orthographicScale / 2;
    y = (y+1) / 2;
    y *= this.actor.gameInstance.threeRenderer.domElement.height;
    return [x, y];
  }

  getScenePosition(x: number, y: number): number[]  {
    let cameraPosition = this.camera.actor.getLocalPosition();

    x /= this.actor.gameInstance.threeRenderer.domElement.width;
    x = x * 2 - 1;
    x *= this.camera.orthographicScale / 2 * this.camera.cachedRatio;
    x += cameraPosition.x;

    y /= this.actor.gameInstance.threeRenderer.domElement.height;
    y = y * 2 - 1;
    y *= this.camera.orthographicScale / 2;
    y -= cameraPosition.y;
    return [x, y];
  }
}
