THREE = SupEngine.THREE

module.exports = class CannonBodyMarker extends SupEngine.ActorComponent
  @Updater: require './CannonBodyMarkerUpdater'

  constructor: (actor) ->
    super actor, 'CannonBodyMarker'

  setSize: (size) ->
    @_clearRenderer() if @cube?

    geometry = new THREE.BoxGeometry size.halfWidth * 2, size.halfHeight * 2, size.halfDepth * 2
    material = new THREE.MeshBasicMaterial wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2
    @cube = new THREE.Mesh geometry, material
    @actor.threeObject.add @cube
    @cube.updateMatrixWorld()
    return

  setOffset: (offset) ->
    @cube.position.setX offset.x
    @cube.position.setY offset.y
    @cube.position.setZ offset.z
    @cube.updateMatrixWorld()
    return

  _clearRenderer: ->
    @actor.threeObject.remove @cube
    @cube.traverse (obj) -> obj.dispose?(); return
    @cube = null
    return

  _destroy: ->
    @_clearRenderer() if @cube?
    super()
    return
