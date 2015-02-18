THREE = SupEngine.THREE

module.exports = class SpriteOriginMarker extends SupEngine.ActorComponent

  constructor: (actor) ->
    super actor, 'SpriteOriginMarker'

    geometry = new THREE.Geometry
    geometry.vertices.push(
      new THREE.Vector3( -0.25, 0, 0 )
      new THREE.Vector3(  0.25, 0, 0 )

      new THREE.Vector3( 0, -0.25, 0 )
      new THREE.Vector3( 0,  0.25, 0 )
    )

    @line = new THREE.Line geometry, new THREE.LineBasicMaterial( color: 0x333333, opacity: 0.25, transparent: true ), THREE.LinePieces
    @actor.threeObject.add @line
    @line.updateMatrixWorld()

  _destroy: ->
    @actor.threeObject.remove @line
    @line.geometry.dispose()
    @line.material.dispose()
    @line = null

    super()
    return
