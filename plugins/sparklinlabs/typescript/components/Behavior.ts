interface BehaviorFunctions {
  awake?: Function;
  start?: Function;
  update?: Function;
  onDestroy?: Function;
}

export default class Behavior extends SupEngine.ActorComponent {
  funcs: BehaviorFunctions;

  constructor(actor: SupEngine.Actor, funcs: BehaviorFunctions) {
    this.funcs = funcs;
    super(actor, "Behavior");
  }

  awake() { if (this.funcs.awake != null) this.funcs.awake(); }
  start() { if (this.funcs.start != null) this.funcs.start(); }
  update() { if (this.funcs.update != null) this.funcs.update(); }

  _destroy() {
    if (this.funcs.onDestroy != null) this.funcs.onDestroy();
    this.funcs = null;
    super._destroy();
  }

  setIsLayerActive(active: boolean) { /* Nothing to render */ }
}
