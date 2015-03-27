THREE = SupEngine.THREE

module.exports = class CannonBodyMarker extends SupEngine.ActorComponent
  @Updater: require './CannonBodyMarkerUpdater'

  constructor: (actor) ->
    super actor, 'CannonBodyMarker'

  setBox: (size) ->
    @_clearRenderer() if @mesh?

    geometry = new THREE.BoxGeometry size.halfWidth * 2, size.halfHeight * 2, size.halfDepth * 2
    material = new THREE.MeshBasicMaterial wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2
    @mesh = new THREE.Mesh geometry, material
    @actor.threeObject.add @mesh
    @mesh.updateMatrixWorld()
    return

  setSphere: (radius) ->
    @_clearRenderer() if @mesh?

    geometry = new THREE.SphereGeometry radius
    material = new THREE.MeshBasicMaterial wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2
    @mesh = new THREE.Mesh geometry, material
    @actor.threeObject.add @mesh
    @mesh.updateMatrixWorld()
    return

  setCylinder: (radius, height) ->
    @_clearRenderer() if @mesh?

    geometry = new THREE.CylinderGeometry radius, radius, height
    material = new THREE.MeshBasicMaterial wireframe: true, color: 0xf459e4, transparent: true, opacity: 0.2
    @mesh = new THREE.Mesh geometry, material
    @mesh.quaternion.setFromAxisAngle new THREE.Vector3(1,0,0), Math.PI / 2
    @actor.threeObject.add @mesh
    @mesh.updateMatrixWorld()
    return

  setOffset: (offset) ->
    @mesh.position.setX offset.x
    @mesh.position.setY offset.y
    @mesh.position.setZ offset.z
    @mesh.updateMatrixWorld()
    return

  _clearRenderer: ->
    @actor.threeObject.remove @mesh
    @mesh.traverse (obj) -> obj.dispose?(); return
    @mesh = null
    return

  _destroy: ->
    @_clearRenderer() if @mesh?
    super()
    return
