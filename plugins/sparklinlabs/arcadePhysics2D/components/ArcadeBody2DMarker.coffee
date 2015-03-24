ArcadeBody2D = require './ArcadeBody2D'
THREE = SupEngine.THREE

module.exports = class ArcadeBody2DMarker extends SupEngine.ActorComponent
  @Updater: require './ArcadeBody2DUpdater'

  constructor: (actor) ->
    super actor, 'ArcadeBody2DMarker'

  setConfig: (config) ->
    @_clearRenderer() if @line?

    epsilon = 0
    geometry = new THREE.Geometry
    geometry.vertices.push new THREE.Vector3 -config.width / 2 + epsilon, -config.height / 2 + epsilon, 0.01
    geometry.vertices.push new THREE.Vector3  config.width / 2 - epsilon, -config.height / 2 + epsilon, 0.01
    geometry.vertices.push new THREE.Vector3  config.width / 2 - epsilon,  config.height / 2 - epsilon, 0.01
    geometry.vertices.push new THREE.Vector3 -config.width / 2 + epsilon,  config.height / 2 - epsilon, 0.01
    geometry.vertices.push new THREE.Vector3 -config.width / 2 + epsilon, -config.height / 2 + epsilon, 0.01

    material = new THREE.LineBasicMaterial color: 0xf459e4

    @line = new THREE.Line geometry, material
    @actor.threeObject.add @line
    @line.updateMatrixWorld()
    return

  _clearRenderer: ->
    @actor.threeObject.remove @line
    @line.traverse (obj) -> obj.dispose?(); return
    @line = null
    return
