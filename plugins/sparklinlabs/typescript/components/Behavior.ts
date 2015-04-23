interface Functions {
  awake?: Function;
  start?: Function;
  update?: Function;
  destroy?: Function;
}

class Behavior extends SupEngine.ActorComponent {
  funcs: Functions;

  constructor(actor: SupEngine.Actor, funcs: Functions) {
    this.funcs = funcs;
    super(actor, "Behavior");
  }

  awake() { if (this.funcs.awake != null) this.funcs.awake(); }
  start() { if (this.funcs.start != null) this.funcs.start(); }
  update() { if (this.funcs.update != null) this.funcs.update(); }

  _destroy() {
    if (this.funcs.destroy != null) this.funcs.destroy();
    this.funcs = null;
    super._destroy();
  }
}
export = Behavior;
