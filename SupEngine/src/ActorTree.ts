import Actor from "./Actor";

export default class ActorTree {
  root: Actor[] = [];

  constructor() {}

  _walkRecurseTopDown(node: Actor, parentNode: Actor, callback: (node: Actor, parentNode?: Actor) => any) {
    callback(node, parentNode);
    for (let child of node.children) this._walkRecurseTopDown(child, node, callback);
  }

  walkTopDown(callback: (node: Actor, parentNode?: Actor) => any) {
    for (let child of this.root) this._walkRecurseTopDown(child, null, callback);
  }

  walkDown(rootNode: Actor, callback: (node: Actor, parentNode?: Actor) => any) {
    for (let child of rootNode.children) this._walkRecurseTopDown(child, rootNode, callback);
  }

  /*
  _walkRecurseBottomUp: (node, parentNode, callback) =>
    this._walkRecurseBottomUp child, node, callback for child in node.children
    callback node, parentNode
    return

  walkBottomUp: (callback) ->
    this._walkRecurseBottomUp node, null, callback for node in this.root
    return
  */
}
