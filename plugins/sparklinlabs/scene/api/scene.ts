module Sup {
  export function loadScene(sceneAsset) {
    player.gameInstance.destroyAllActors();
    appendScene(sceneAsset);
  }
  export function appendScene(sceneAsset) {
    function walk(node, parentActor) {
      var actor = player.createActor(node.name, parentActor);

      actor.__inner.setLocalPosition( tmpVector3.set(node.position.x, node.position.y, node.position.z) )
      actor.__inner.setLocalOrientation( tmpQuaternion.set(node.orientation.x, node.orientation.y, node.orientation.z, node.orientation.w) )
      actor.__inner.setLocalScale( tmpVector3.set(node.scale.x, node.scale.y, node.scale.z) )

      node.components.forEach( (sceneComponent) => {
        var actorComponent = player.createComponent(sceneComponent.type, actor, sceneComponent.config);
        SupRuntime.plugins[sceneComponent.type].setupComponent(player, actorComponent.__inner, sceneComponent.config);
      })

      node.children.forEach( (child) => { walk(child, actor); } )

      return actor
    }
    function awakeActor(actor) {
      actor.__inner.awake();
      actor.getChildren().forEach( (child) => { awakeActor(child); } )
    }

    var actors = [];
    sceneAsset.__inner.nodes.forEach( (node) => { actors.push( walk(node, null) ); } )
    actors.forEach( (actor) => { awakeActor(actor); })

    return actors
  }

  export class Scene extends Asset {}
}
