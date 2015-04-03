import Actor = require("./Actor");

class ActorTree {
  root: Actor[] = [];

  constructor() {}

  _walkRecurseTopDown(node: Actor, parentNode: Actor, callback: (node: Actor, parentNode?: Actor) => any) {
    callback(node, parentNode);
    node.children.forEach((child: Actor) => { this._walkRecurseTopDown(child, node, callback); });
  }

  walkTopDown(callback: (node: Actor, parentNode?: Actor) => any) {
    this.root.forEach((child: Actor) => { this._walkRecurseTopDown(child, null, callback); });
  }

  walkDown(rootNode: Actor, callback: (node: Actor, parentNode?: Actor) => any) {
    rootNode.children.forEach((child: Actor) => { this._walkRecurseTopDown(child, rootNode, callback); });
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

export = ActorTree;
