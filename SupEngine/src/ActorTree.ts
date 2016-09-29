import Actor from "./Actor";

export default class ActorTree {
  root: Actor[] = [];

  constructor() { /* Nothing here */ }

  _walkRecurseTopDown(node: Actor, parentNode: Actor, callback: (node: Actor, parentNode?: Actor) => boolean) {
    if (callback(node, parentNode) === false) return false;

    for (const child of node.children) {
      if (this._walkRecurseTopDown(child, node, callback) === false) return false;
    }

    return true;
  }

  walkTopDown(callback: (node: Actor, parentNode?: Actor) => boolean): boolean {
    for (const child of this.root) {
      if (this._walkRecurseTopDown(child, null, callback) === false) return false;
    }

    return true;
  }

  walkDown(rootNode: Actor, callback: (node: Actor, parentNode?: Actor) => any) {
    for (const child of rootNode.children) {
      if (this._walkRecurseTopDown(child, rootNode, callback) === false) return false;
    }

    return true;
  }
}
