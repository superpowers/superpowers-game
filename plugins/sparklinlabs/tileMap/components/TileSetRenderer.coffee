THREE = SupEngine.THREE

module.exports = class TileSetRenderer extends SupEngine.ActorComponent

  @Updater: require './TileSetRendererUpdater'

  constructor: (actor, asset, scaleRatio) ->
    super actor, 'TileSetRenderer'

    @setTileSet asset, scaleRatio

  setTileSet: (asset, scaleRatio) ->
    @_clearMesh()
    @_createMesh asset, scaleRatio if asset?
    @asset = asset
    return

  _createMesh: (asset, scaleRatio) ->
    geometry = new THREE.PlaneBufferGeometry asset.data.texture.image.width, asset.data.texture.image.height
    material = new THREE.MeshBasicMaterial map: asset.data.texture, alphaTest: 0.1, side: THREE.DoubleSide

    @mesh = new THREE.Mesh geometry, material
    @mesh.scale.set scaleRatio, scaleRatio, scaleRatio
    @mesh.position.setX asset.data.texture.image.width / 2 * scaleRatio
    @mesh.position.setY -asset.data.texture.image.height / 2 * scaleRatio
    @mesh.updateMatrixWorld()
    @actor.threeObject.add @mesh
    return

  _clearMesh: ->
    return if ! @mesh?

    @mesh.traverse (obj) -> obj.dispose?(); return
    @actor.threeObject.remove @mesh
    @mesh = null
    return

  _destroy: ->
    @_clearMesh()
    @asset = null
    super()
    return
