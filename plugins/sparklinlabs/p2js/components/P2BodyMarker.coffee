THREE = SupEngine.THREE

module.exports = class P2BodyMarker extends SupEngine.ActorComponent
  @Updater: require './P2BodyMarkerUpdater'

  constructor: (actor) ->
    super actor, 'P2BodyMarker'

  setRectangle: (width, height) ->
    @_clearRenderer() if @mesh?

    geometry = new THREE.Geometry
    geometry.vertices.push new THREE.Vector3 -width / 2, -height / 2, 0
    geometry.vertices.push new THREE.Vector3  width / 2, -height / 2, 0
    geometry.vertices.push new THREE.Vector3  width / 2,  height / 2, 0
    geometry.vertices.push new THREE.Vector3 -width / 2,  height / 2, 0
    geometry.vertices.push new THREE.Vector3 -width / 2, -height / 2, 0
    material = new THREE.LineBasicMaterial color: 0xf459e4
    @mesh = new THREE.Line geometry, material
    @actor.threeObject.add @mesh
    @mesh.updateMatrixWorld()
    return

  setCircle: (radius) ->
    @_clearRenderer() if @mesh?

    geometry = new THREE.CircleGeometry radius, 16
    material = new THREE.MeshBasicMaterial color: 0xf459e4, wireframe: true
    @mesh = new THREE.Mesh geometry, material
    @actor.threeObject.add @mesh
    @mesh.updateMatrixWorld()
    return

  setOffset: (offset) ->
    @mesh.position.setX offset.x
    @mesh.position.setY offset.y
    @mesh.position.setZ 0.01
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
