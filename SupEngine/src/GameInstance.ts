import events = require("events");
import THREE = require("three");

import ActorTree = require("./ActorTree");
import Actor = require("./Actor");
import ActorComponent = require("./ActorComponent");
import Input = require("./Input");
import Audio = require("./Audio");
import Camera = require("./components/Camera");


class GameInstance extends events.EventEmitter {
  static framesPerSecond = 60;

  debug: boolean;
  ratio: number;
  tree = new ActorTree();
  cachedActors: Actor[] = [];
  renderComponents: Camera[] = [];
  componentsToBeStarted: ActorComponent[] = [];
  componentsToBeDestroyed: ActorComponent[] = [];
  actorsToBeDestroyed: Actor[] = [];
  skipRendering = false;
  exited = false;

  input: Input;
  audio = new Audio();

  threeRenderer: THREE.WebGLRenderer;
  threeScene = new THREE.Scene();

  constructor(canvas: HTMLCanvasElement, options: {debug?: boolean} = {}) {
    super()

    // Used to know whether or not we have to close the window at exit when using NW.js
    this.debug = options.debug == true;

    this.input = new Input(canvas);

    this.threeRenderer = new THREE.WebGLRenderer({
      canvas, precision: 'mediump',
      alpha: false, antialias: false, stencil: false
    });
    this.threeRenderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.threeRenderer.autoClearColor = false
    // this.threeRenderer.setFaceCulling(THREE.CullFaceNone);
    // this.threeRenderer.setBlending(THREE.CustomBlending, THREE.AddEquation, THREE.OneFactor, THREE.OneMinusSrcAlphaFactor);

    this.threeScene.autoUpdate = false;
  }

  /*init: (callback) ->
    callback()*/

  update() {
    this.input.update();

    // Build cached actors list
    this.cachedActors.length = 0;
    this.tree.walkTopDown( (actor) => { this.cachedActors.push(actor); });

    // Start newly-added components
    var index = 0;
    while (index < this.componentsToBeStarted.length) {
      var component = this.componentsToBeStarted[index];

      // If the component to be started is part of an actor
      // which will not be updated, skip it until next loop
      if (this.cachedActors.indexOf(component.actor) == -1) {
        index++;
        continue;
      }

      component.start();
      this.componentsToBeStarted.splice(index, 1);
    }

    for (var pluginName in SupEngine.earlyUpdateFunctions) { SupEngine.earlyUpdateFunctions[pluginName](); }

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

  draw() {
    var width: number;
    var height: number;

    if (this.ratio != null) {
      if (document.body.clientWidth / document.body.clientHeight > this.ratio) {
        height = document.body.clientHeight;
        width = Math.min(document.body.clientWidth, height * this.ratio)
      }
      else {
        width = document.body.clientWidth;
        height = Math.min(document.body.clientHeight, width / this.ratio)
      }
    }
    else {
      width = this.threeRenderer.domElement.clientWidth;
      height = this.threeRenderer.domElement.clientHeight;
    }

    if (this.threeRenderer.domElement.width != width || this.threeRenderer.domElement.height != height) {
      this.threeRenderer.setSize(width, height, false);
      this.emit("resize", { width, height });
    }

    this.threeRenderer.clear();
    this.renderComponents.sort( (a, b) => { return this.cachedActors.indexOf(a.actor) - this.cachedActors.indexOf(b.actor); } );
    this.renderComponents.forEach((renderComponent) => { renderComponent.render(); });
  }

  clear() { this.threeRenderer.clear(); }

  destroyComponent(component: ActorComponent) {
    if (this.componentsToBeDestroyed.indexOf(component) != -1) return;

    this.componentsToBeDestroyed.push(component);

    var index = this.componentsToBeStarted.indexOf(component);
    if (index != -1) this.componentsToBeStarted.splice(index, 1);
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

    var cachedIndex = this.cachedActors.indexOf(actor);
    if (cachedIndex != -1) this.cachedActors.splice(cachedIndex, 1)

    actor._destroy()
  }
}

export = GameInstance;
