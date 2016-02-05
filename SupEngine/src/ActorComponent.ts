import Actor from "./Actor";

abstract class ActorComponent {
  actor: Actor;
  typeName: string;

  constructor(actor: Actor, typeName: string) {
    this.actor = actor;
    this.typeName = typeName;
    this.actor.components.push(this);
    this.actor.gameInstance.componentsToBeStarted.push(this);
  }

  _destroy() {
    let outer = (<any>this).__outer;
    if (outer != null) outer.__inner = null;

    let startIndex = this.actor.gameInstance.componentsToBeStarted.indexOf(this);
    if (startIndex !== -1) this.actor.gameInstance.componentsToBeStarted.splice(startIndex, 1);

    let index = this.actor.components.indexOf(this);
    if (index !== -1) this.actor.components.splice(index, 1);
    this.actor = null;
  }

  awake() { /* Nothing here */ }
  start() { /* Nothing here */ }
  update() { /* Nothing here */ }

  // You must override it in your child class and hide your stuff when active is false
  abstract setIsLayerActive(active: boolean): void;
}

export default ActorComponent;
