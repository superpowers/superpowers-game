THREE = SupEngine.THREE

module.exports = class TileSetRenderer extends SupEngine.ActorComponent

  @Updater: require './TileSetRendererUpdater'

  constructor: (actor, asset, scaleRatio) ->
    super actor, 'TileSetRenderer'

    gridActor = new SupEngine.Actor @actor.gameInstance, "Grid"
    gridActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 1
    @gridRenderer = new SupEngine.editorComponents.GridRenderer gridActor

    @selectedTileActor = new SupEngine.Actor @actor.gameInstance, "Selection"
    selectedTileRenderer = new SupEngine.editorComponents.FlatColorRenderer @selectedTileActor, "#900090", 1, 1

    @setTileSet asset, scaleRatio

  setTileSet: (asset, scaleRatio) ->
    @_clearMesh()
    @asset = asset
    @_createMesh asset, scaleRatio if @asset?
    return

  select: (x, y, width=1, height=1) ->
    @selectedTileActor.setLocalPosition new SupEngine.THREE.Vector3 x, -y, 2
    @selectedTileActor.setLocalScale new SupEngine.THREE.Vector3 width, -height, 1
    return

  _createMesh: (asset) ->
    geometry = new THREE.PlaneBufferGeometry asset.data.texture.image.width, asset.data.texture.image.height
    material = new THREE.MeshBasicMaterial map: asset.data.texture, alphaTest: 0.1, side: THREE.DoubleSide

    @mesh = new THREE.Mesh geometry, material
    @actor.threeObject.add @mesh
    @refreshScaleRatio()
    return

  refreshScaleRatio: ->
    scaleRatio = 1 / @asset.data.gridSize
    @mesh.scale.set scaleRatio, scaleRatio, scaleRatio
    @mesh.position.setX @asset.data.texture.image.width / 2 * scaleRatio
    @mesh.position.setY -@asset.data.texture.image.height / 2 * scaleRatio
    @mesh.updateMatrixWorld()

    @select 0, 0
    return

  _clearMesh: ->
    return if ! @mesh?

    @mesh.traverse (obj) -> obj.dispose?(); return
    @actor.threeObject.remove @mesh
    @mesh = null
    return

  _destroy: ->
    @_clearMesh()
    @actor.gameInstance.destroyActor @gridRenderer.actor
    @actor.gameInstance.destroyActor @selectedTileActor
    @asset = null
    super()
    return
