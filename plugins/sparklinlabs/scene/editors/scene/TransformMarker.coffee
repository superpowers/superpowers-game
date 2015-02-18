THREE = SupEngine.THREE

module.exports = class TransformMarker extends SupEngine.ActorComponent

  constructor: (actor) ->
    super actor, 'TransformMarker'

    geometry = new THREE.Geometry
    geometry.vertices.push(
      new THREE.Vector3( -0.25, 0, 0 )
      new THREE.Vector3(  0.25, 0, 0 )

      new THREE.Vector3( 0, -0.25, 0 )
      new THREE.Vector3( 0,  0.25, 0 )

      new THREE.Vector3( 0, 0, -0.25 )
      new THREE.Vector3( 0, 0,  0.25 )
    )

    @line = new THREE.Line geometry, new THREE.LineBasicMaterial( color: 0xffffff, opacity: 0.25, transparent: true ), THREE.LinePieces
    @actor.threeObject.add @line
    @line.updateMatrixWorld()

  _destroy: ->
    @actor.threeObject.remove @line
    @line.geometry.dispose()
    @line.material.dispose()
    @line = null

    super()
    return
