ArcadeBody2D = require './ArcadeBody2D'
THREE = SupEngine.THREE

module.exports = class ArcadeBody2DMarker extends SupEngine.ActorComponent
  @Updater: require './ArcadeBody2DUpdater'

  constructor: (actor) ->
    super actor, 'ArcadeBody2DMarker'

  setSize: (size) ->
    @_clearRenderer() if @line?

    epsilon = 0
    geometry = new THREE.Geometry
    geometry.vertices.push new THREE.Vector3 -size.width / 2 + epsilon, -size.height / 2 + epsilon, 0.01
    geometry.vertices.push new THREE.Vector3  size.width / 2 - epsilon, -size.height / 2 + epsilon, 0.01
    geometry.vertices.push new THREE.Vector3  size.width / 2 - epsilon,  size.height / 2 - epsilon, 0.01
    geometry.vertices.push new THREE.Vector3 -size.width / 2 + epsilon,  size.height / 2 - epsilon, 0.01
    geometry.vertices.push new THREE.Vector3 -size.width / 2 + epsilon, -size.height / 2 + epsilon, 0.01

    material = new THREE.LineBasicMaterial color: 0xf459e4

    @line = new THREE.Line geometry, material
    @actor.threeObject.add @line
    @line.updateMatrixWorld()
    return

  setOffset: (offset) ->
    @line.position.setX offset.x
    @line.position.setY offset.y
    @line.updateMatrixWorld()
    return

  _clearRenderer: ->
    @actor.threeObject.remove @line
    @line.traverse (obj) -> obj.dispose?(); return
    @line = null
    return
