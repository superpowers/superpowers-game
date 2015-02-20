tmpVector3 = new SupEngine.THREE.Vector3()
tmpQuaternion = new SupEngine.THREE.Quaternion()

exports.loadAsset = (player, entry, callback) ->
  player.getAssetData "assets/#{entry.id}/asset.json", 'json', callback
  return

exports.typescript = """
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
      actor.__inner.awake()
      actor.getChildren().forEach( (child) => { awakeActor(child); } )
    }

    var actors = [];
    sceneAsset.nodes.forEach( (node) => { actors.push( walk(node, null) ); } )
    actors.forEach( (actor) => { awakeActor(actor); })

    return actors
  }
}
"""

exports.typescriptDefs = """
declare module Sup {
  function loadScene(sceneAsset: Asset): void;
  function appendScene(sceneAsset: Asset): Array<Asset>
}
"""

exports.script =
  """
  namespace Sup
    transcendental machine loadScene(blackbox sceneAsset)
    transcendental machine appendScene(blackbox sceneAsset): List
  """

exports.js = (player) ->
  appendScene = (sceneAsset) ->
    walk = (node, parentActor) ->
      actor = player.createActor node.name, parentActor

      tmpVector3.set node.position.x, node.position.y, node.position.z
      actor.__inner.setLocalPosition tmpVector3
      tmpQuaternion.set node.orientation.x, node.orientation.y, node.orientation.z, node.orientation.w
      actor.__inner.setLocalOrientation tmpQuaternion
      tmpVector3.set node.scale.x, node.scale.y, node.scale.z
      actor.__inner.setLocalScale tmpVector3

      for sceneComponent in node.components
        actorComponent = player.createComponent sceneComponent.type, actor, sceneComponent.config
        SupRuntime.plugins[sceneComponent.type].setupComponent player, actorComponent.__inner, sceneComponent.config

      walk child, actor for child in node.children

      actor

    awakeActor = (actor) ->
      actor.__inner.awake()
      awakeActor child for child in actor.getChildren()
      return

    actors = ( walk node, null for node in sceneAsset.nodes )
    awakeActor actor for actor in actors

    actors

  'Sup':
    'loadScene': (sceneAsset) ->
      player.scriptRoot.Sup.destroyAllActors()
      appendScene sceneAsset; return

    'appendScene': appendScene
