module Sup {

  export function log(x) { console.log(x); }

  export function exit() {
    player.gameInstance.destroyAllActors();
    player.gameInstance.exited = true;

    // Close window only if running release mode in NW.js
    if (! player.gameInstance.debug && window.nwDispatcher != null)
      window.nwDispatcher.requireNwGui().Window.get().close();
  }

  export class Asset {
    type: string;
    children: Array<string>;
    __inner: any;

    constructor(inner) {
      this.__inner = inner;
      this.__inner.__outer = this;
    }
  }

  export class Folder extends Asset {}

  export function get(path, arg1, arg2) {
    var type = arg1;
    var options = (arg2 !== undefined) ? arg2 : { ignoreMissing: false };

    if (arg1 != null && Object.getPrototypeOf(arg1) == Object.prototype) {
      type = null;
      options = arg1;
    }

    var entry = player.entriesByPath[path];

    if (entry) { var outerAsset = player.getOuterAsset(entry.id); }
    else if(!options.ignoreMissing) { throw new Error("Invalid asset path: " + path) }

    if (type != null && outerAsset !=null) {
      var typeName = type.name.charAt(0).toLowerCase() + type.name.slice(1);
      if (typeName != outerAsset.type) { throw new Error("Invalid asset type") }
    }

    return (outerAsset) ? outerAsset : null
  }

  export function getActor(name) {
    var foundActor = null;
    player.gameInstance.tree.walkTopDown( (actor) => { if ( actor.name == name && ! actor.pendingForDestruction ) { foundActor = (foundActor) ? foundActor: actor.__outer; } } )
    return foundActor
  }

  export function destroyAllActors() {
    player.gameInstance.destroyAllActors();
    player.gameInstance.tree.walkTopDown( (actor) => { actor.__outer.__inner = null; actor.__outer = null; } )
  }

  export class ActorComponent {
    actor: Actor;
    __inner: any;

    constructor(actor) {
      this.actor = actor;
    }
    destroy() {
      player.gameInstance.destroyComponent(this.__inner);
    }
  }

  export class Behavior extends ActorComponent {
    awake: Function;
    start: Function;
    update: Function;
    onDestroy: Function;

    constructor(actor) {
      if (actor.__outer == null) { throw new Error("Use actor.addBehavior to create a behavior"); }

      super(actor.__outer);

      var funcs = {};
      funcs["awake"]  = (this.awake)  ? this.awake.bind(this) : null;
      funcs["start"]  = (this.start)  ? this.start.bind(this) : null;
      funcs["update"] = (this.update) ? this.update.bind(this) : null;
      funcs["destroy"] = (this.onDestroy) ? this.onDestroy.bind(this) : null;
      this.__inner = new SupEngine.componentClasses.Behavior(actor, funcs);

      this.__inner.__outer = this;
      this.actor.__behaviors[this.constructor["name"]] = this;
    }
  }

  export function registerBehavior(behavior) { player.behaviorClasses[behavior["name"]] = behavior; }

}

window.Sup = Sup;
