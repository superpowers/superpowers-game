THREE = SupEngine.THREE
TileLayerGeometry = require './TileLayerGeometry'

module.exports = class TileMapRenderer extends SupEngine.ActorComponent

  @Updater: require './TileMapRendererUpdater'

  constructor: (actor, @tileMap, @tileSet) ->
    super actor, 'TileMapRenderer'

    if @tileSet?
      @_setupTexture()
      @_createLayerMeshes() if @tileMap?

  setTileMap: (asset) ->
    @_clearLayerMeshes() if @layerMeshes?

    @tileMap = asset
    return if ! @tileSet? or ! @tileMap?

    @_createLayerMeshes()
    return

  setTileSet: (asset) ->
    if @tileSetTexture?
      @_clearTexture()
      @_clearLayerMeshes() if @tileMap?

    @tileSet = asset
    return if ! @tileSet?

    @_setupTexture()
    @_createLayerMeshes() if @tileMap?
    return

  _createLayerMeshes: ->
    @layerMeshes = []
    @layerMeshesById = {}
    @addLayer layer, layerIndex for layer, layerIndex in @tileMap.data.layers

    @tileMap.on 'setTileAt', @_onSetTileAt
    return

  _clearLayerMeshes: ->
    for layerMesh in @layerMeshes
      layerMesh.traverse (obj) -> obj.dispose?(); return
      @actor.threeObject.remove layerMesh

    @layerMeshes = null
    @layerMeshesById = null

    @tileMap.removeListener 'setTileAt', @_onSetTileAt
    return

  _setupTexture: ->
    @tileSetTexture = @tileSet.data.texture
    @tilesPerRow = @tileSetTexture.image.width / @tileSet.data.gridSize
    @tilesPerColumn = @tileSetTexture.image.height / @tileSet.data.gridSize
    return

  _clearTexture: ->
    @tileSetTexture = null
    return

  _destroy: ->
    if @tileSetTexture?
      @_clearLayerMeshes() if @layerMeshes?
      @_clearTexture()

    @tileMap = null
    @tileSet = null
    super()
    return

  addLayer: (layer, layerIndex) ->
    geometry = new TileLayerGeometry @tileMap.data.width * @tileSet.data.gridSize, @tileMap.data.height * @tileSet.data.gridSize, @tileMap.data.width, @tileMap.data.height
    material = new THREE.MeshBasicMaterial map: @tileSetTexture, alphaTest: 0.1, side: THREE.DoubleSide, transparent: true
    layerMesh = new THREE.Mesh geometry, material

    scaleRatio = 1 / @tileMap.data.pixelsPerUnit
    layerMesh.scale.set scaleRatio, scaleRatio, 1
    layerMesh.updateMatrixWorld()

    @layerMeshes.splice layerIndex, 0, layerMesh
    @layerMeshesById[layer.id] = layerMesh
    @actor.threeObject.add layerMesh

    for y in [0...@tileMap.data.height]
      for x in [0...@tileMap.data.width]
        @refreshTileAt layerIndex, x, y

    @refreshLayersDepth()
    return

  deleteLayer: (layerIndex) ->
    @actor.threeObject.remove @layerMeshes[layerIndex]
    @layerMeshes.splice layerIndex, 1

    @refreshLayersDepth()
    return

  moveLayer: (layerId, newIndex) ->
    layer = @layerMeshesById[layerId]
    @layerMeshes.splice @layerMeshes.indexOf(layer), 1
    @layerMeshes.splice newIndex, 0, layer

    @refreshLayersDepth()
    return

  refreshPixelsPerUnit: (pixelsPerUnit)->
    @tileMap.data.pixelsPerUnit = pixelsPerUnit if pixelsPerUnit?
    scaleRatio = 1 / @tileMap.data.pixelsPerUnit
    for layerMesh, layerMeshIndex in @layerMeshes
      layerMesh.scale.set scaleRatio, scaleRatio, 1
      layerMesh.updateMatrixWorld()
    return

  refreshLayersDepth: ->
    for layerMesh, layerMeshIndex in @layerMeshes
      layerMesh.position.setZ layerMeshIndex * @tileMap.data.layerDepthOffset
      layerMesh.updateMatrixWorld()
    return

  refreshEntireMap: ->
    for layerIndex in [0...@tileMap.data.layers.length]
      for y in [0...@tileMap.data.height]
        for x in [0...@tileMap.data.width]
          @refreshTileAt layerIndex, x, y

    @refreshLayersDepth()
    return

  _onSetTileAt: (layerIndex, x, y) => @refreshTileAt layerIndex, x, y; return

  refreshTileAt: (layerIndex, x, y) ->
    [tileX, tileY, flipX, flipY, angle] = @tileMap.getTileAt layerIndex, x, y
    if tileX == -1 or tileY == -1 or tileX >= @tilesPerRow or tileY >= @tilesPerColumn
      tileX = @tilesPerRow - 1
      tileY = @tilesPerColumn - 1

    left   = (tileX     * @tileSet.data.gridSize + 0.2) / @tileSetTexture.image.width
    right  = ((tileX+1) * @tileSet.data.gridSize - 0.2) / @tileSetTexture.image.width
    bottom = 1 - ((tileY+1) * @tileSet.data.gridSize - 0.2) / @tileSetTexture.image.height
    top    = 1 - (tileY     * @tileSet.data.gridSize + 0.2) / @tileSetTexture.image.height

    if flipX
      temp = right
      right = left
      left = temp

    if flipY
      temp = bottom
      bottom = top
      top = temp

    quadIndex = (x + y * @tileMap.data.width)
    layerMesh = @layerMeshes[layerIndex]
    uvs = layerMesh.geometry.getAttribute 'uv'
    uvs.needsUpdate = true

    switch angle
      when 0
        uvs.array[quadIndex * 8 + 0] = left
        uvs.array[quadIndex * 8 + 1] = bottom

        uvs.array[quadIndex * 8 + 2] = right
        uvs.array[quadIndex * 8 + 3] = bottom

        uvs.array[quadIndex * 8 + 4] = right
        uvs.array[quadIndex * 8 + 5] = top

        uvs.array[quadIndex * 8 + 6] = left
        uvs.array[quadIndex * 8 + 7] = top

      when 90
        uvs.array[quadIndex * 8 + 0] = left
        uvs.array[quadIndex * 8 + 1] = top

        uvs.array[quadIndex * 8 + 2] = left
        uvs.array[quadIndex * 8 + 3] = bottom

        uvs.array[quadIndex * 8 + 4] = right
        uvs.array[quadIndex * 8 + 5] = bottom

        uvs.array[quadIndex * 8 + 6] = right
        uvs.array[quadIndex * 8 + 7] = top

      when 180
        uvs.array[quadIndex * 8 + 0] = right
        uvs.array[quadIndex * 8 + 1] = top

        uvs.array[quadIndex * 8 + 2] = left
        uvs.array[quadIndex * 8 + 3] = top

        uvs.array[quadIndex * 8 + 4] = left
        uvs.array[quadIndex * 8 + 5] = bottom

        uvs.array[quadIndex * 8 + 6] = right
        uvs.array[quadIndex * 8 + 7] = bottom

      when 270
        uvs.array[quadIndex * 8 + 0] = right
        uvs.array[quadIndex * 8 + 1] = bottom

        uvs.array[quadIndex * 8 + 2] = right
        uvs.array[quadIndex * 8 + 3] = top

        uvs.array[quadIndex * 8 + 4] = left
        uvs.array[quadIndex * 8 + 5] = top

        uvs.array[quadIndex * 8 + 6] = left
        uvs.array[quadIndex * 8 + 7] = bottom
    return
