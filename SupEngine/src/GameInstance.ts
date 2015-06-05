import { EventEmitter } from "events";
import * as THREE from "three";

import ActorTree from "./ActorTree";
import Actor from "./Actor";
import ActorComponent from "./ActorComponent";
import Input from "./Input";
import Audio from "./Audio";
import Camera from "./components/Camera";

export default class GameInstance extends EventEmitter {
  framesPerSecond = 60;
  ratio: number;
  layers: string[] = [ "Default" ];
  
  tree = new ActorTree();
  cachedActors: Actor[] = [];
  renderComponents: Camera[] = [];
  componentsToBeStarted: ActorComponent[] = [];
  componentsToBeDestroyed: ActorComponent[] = [];
  actorsToBeDestroyed: Actor[] = [];

  input: Input;
  audio = new Audio();

  threeRenderer: THREE.WebGLRenderer;
  threeScene = new THREE.Scene();

  debug: boolean;
  skipRendering = false;
  exitCallback: Function;
  exited = false;

  constructor(canvas: HTMLCanvasElement, options: { debug?: boolean; enableOnExit?: boolean; layers?: string[]; } = {}) {
    super();

    // Used to know whether or not we have to close the window at exit when using NW.js
    this.debug = options.debug === true;

    // Exit callback is only enabled when playing the actual game, not in most editors
    let enableOnExit = (options.enableOnExit != null) ? options.enableOnExit : false;
    this.input = new Input(canvas, options.enableOnExit ? { exitCallback: this._doExitCallback } : null);
    
    // Setup layers
    if (options.layers != null) this.layers = options.layers;

    try { this.threeRenderer = new THREE.WebGLRenderer({ canvas, precision: "mediump", alpha: false, antialias: false, stencil: false }); }
    catch (e) { return; }
    this.threeRenderer.setSize(0, 0, false);
    this.threeRenderer.autoClearColor = false;

    this.threeScene.autoUpdate = false;
  }

  tick(accumulatedTime: number): { updates: number; timeLeft: number; }  {
    let updateInterval = 1 / this.framesPerSecond * 1000;
    let maxAccumulatedTime = 5 * updateInterval;

    // If the game is running slowly, don't fall into the well of dispair
    if (accumulatedTime > maxAccumulatedTime) accumulatedTime = maxAccumulatedTime;

    // Update
    let updates = 0;
    while (accumulatedTime >= updateInterval) {
      this.update();
      if (this.exited) break;
      accumulatedTime -= updateInterval;
      updates++;
    }

    return { updates, timeLeft: accumulatedTime };
  }

  update() {
    this.input.update();

    // Build cached actors list
    this.cachedActors.length = 0;
    this.tree.walkTopDown( (actor) => { this.cachedActors.push(actor); });

    // Start newly-added components
    let index = 0;
    while (index < this.componentsToBeStarted.length) {
      let component = this.componentsToBeStarted[index];

      // If the component to be started is part of an actor
      // which will not be updated, skip it until next loop
      if (this.cachedActors.indexOf(component.actor) === -1) {
        index++;
        continue;
      }

      component.start();
      this.componentsToBeStarted.splice(index, 1);
    }

    for (let pluginName in SupEngine.earlyUpdateFunctions) { SupEngine.earlyUpdateFunctions[pluginName](); }

    // Update all actors
    this.cachedActors.forEach((actor) => { actor.update(); });

    // Apply pending component / actor destructions
    this.componentsToBeDestroyed.forEach((component) => { this._doComponentDestruction(component); });
    this.componentsToBeDestroyed.length = 0;

    this.actorsToBeDestroyed.forEach((actor) => { this._doActorDestruction(actor); });
    this.actorsToBeDestroyed.length = 0;

    if (this.exited) { this.threeRenderer.clear(); return; }
    if (this.skipRendering) { this.skipRendering = false; this.update(); return; }
  }

  setRatio(ratio?: number) {
    this.ratio = ratio;
    if (this.ratio != null) {
      this.threeRenderer.domElement.style.margin = "auto";
      this.threeRenderer.domElement.style.flex = "none";
    }
    else {
      this.threeRenderer.domElement.style.margin = "0";
      this.threeRenderer.domElement.style.flex = "1";
    }
    this.resizeRenderer();
  }

  resizeRenderer() {
    let width: number;
    let height: number;

    if (this.ratio != null) {
      if (document.body.clientWidth / document.body.clientHeight > this.ratio) {
        height = document.body.clientHeight;
        width = Math.min(document.body.clientWidth, height * this.ratio);
      }
      else {
        width = document.body.clientWidth;
        height = Math.min(document.body.clientHeight, width / this.ratio);
      }
    }
    else {
      width = this.threeRenderer.domElement.clientWidth;
      height = this.threeRenderer.domElement.clientHeight;
    }

    if (this.threeRenderer.domElement.width !== width || this.threeRenderer.domElement.height !== height) {
      this.threeRenderer.setSize(width, height, false);
      this.emit("resize", { width, height });
    }
  }
  
  setActiveLayer(layer: number) {
    for (let cachedActor of this.cachedActors) cachedActor.setActiveLayer(layer);
  }

  draw() {
    this.resizeRenderer();

    this.threeRenderer.clear();
    this.renderComponents.sort((a, b) => {
      let order = (a.depth - b.depth);
      if (order === 0) order = this.cachedActors.indexOf(a.actor) - this.cachedActors.indexOf(b.actor);
      return order;
    });
    for (let renderComponent of this.renderComponents) renderComponent.render();
  }

  clear() { this.threeRenderer.clear(); }

  destroyComponent(component: ActorComponent) {
    if (this.componentsToBeDestroyed.indexOf(component) !== -1) return;

    this.componentsToBeDestroyed.push(component);

    let index = this.componentsToBeStarted.indexOf(component);
    if (index !== -1) this.componentsToBeStarted.splice(index, 1);
  }

  destroyActor(actor: Actor) {
    if (actor.pendingForDestruction) return;

    this.actorsToBeDestroyed.push(actor);
    actor._markDestructionPending();
  }

  destroyAllActors() {
    this.tree.walkTopDown( (actor) => { this.destroyActor(actor); } );
    this.skipRendering = true;
  }

  _doComponentDestruction(component: ActorComponent) { component._destroy(); }

  _doActorDestruction(actor: Actor) {
    while (actor.children.length > 0) this._doActorDestruction(actor.children[0]);

    let cachedIndex = this.cachedActors.indexOf(actor);
    if (cachedIndex !== -1) this.cachedActors.splice(cachedIndex, 1);

    actor._destroy();
  }

  _doExitCallback = () => {
    if (this.exitCallback != null) {
      this.exitCallback();
      this.exitCallback = null;
    }
  };
}
