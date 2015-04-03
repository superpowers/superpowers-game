import Actor = require("./Actor");

class ActorComponent {
  actor: Actor;
  typeName: string;

  constructor(actor: Actor, typeName: string) {
    this.actor = actor;
    this.typeName = typeName;
    this.actor.components.push(this);
    this.actor.gameInstance.componentsToBeStarted.push(this);
  }

  _destroy() {
    var startIndex = this.actor.gameInstance.componentsToBeStarted.indexOf(this);
    if (startIndex != -1) this.actor.gameInstance.componentsToBeStarted.splice(startIndex, 1);

    var index = this.actor.components.indexOf(this);
    if (index != -1) this.actor.components.splice(index, 1);
    this.actor = null;
  }

  awake() {}
  start() {}
  update() {}
}

export = ActorComponent;
