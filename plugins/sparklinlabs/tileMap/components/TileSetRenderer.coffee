THREE = SupEngine.THREE

module.exports = class TileSetRenderer extends SupEngine.ActorComponent

  @Updater: require './TileSetRendererUpdater'

  constructor: (actor, asset, overrideTexture=null) ->
    super actor, 'TileSetRenderer'

    gridActor = new SupEngine.Actor @actor.gameInstance, "Grid"
    gridActor.setLocalPosition new SupEngine.THREE.Vector3 0, 0, 1
    @gridRenderer = new SupEngine.editorComponentClasses.GridRenderer gridActor

    @selectedTileActor = new SupEngine.Actor @actor.gameInstance, "Selection"
    selectedTileRenderer = new SupEngine.editorComponentClasses.FlatColorRenderer @selectedTileActor, "#900090", 1, 1

    @setTileSet asset, overrideTexture ? asset?.data.texture

  setTileSet: (asset, texture) ->
    @_clearMesh()
    @asset = asset

    if @asset?
      geometry = new THREE.PlaneBufferGeometry texture.image.width, texture.image.height
      material = new THREE.MeshBasicMaterial map: texture, alphaTest: 0.1, side: THREE.DoubleSide

      @mesh = new THREE.Mesh geometry, material
      @actor.threeObject.add @mesh
      @refreshScaleRatio()
    return

  select: (x, y, width=1, height=1) ->
    @selectedTileActor.setLocalPosition new SupEngine.THREE.Vector3 x, -y, 2
    @selectedTileActor.setLocalScale new SupEngine.THREE.Vector3 width, -height, 1
    return

  refreshScaleRatio: ->
    scaleRatio = 1 / @asset.data.gridSize
    @mesh.scale.set scaleRatio, scaleRatio, scaleRatio
    @mesh.position.setX @mesh.material.map.image.width / 2 * scaleRatio
    @mesh.position.setY -@mesh.material.map.image.height / 2 * scaleRatio
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
