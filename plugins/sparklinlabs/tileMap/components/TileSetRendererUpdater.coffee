TileSet = require './TileSet'

module.exports = class TileSetRendererUpdater

  constructor: (@client, @tileSetRenderer, config, @receiveAssetCallbacks, @editAssetCallbacks) ->
    @tileSetAssetId = config.tileSetAssetId
    @tileSetAsset = null
    @tileSetThreeTexture = null

    @tileSetSubscriber =
      onAssetReceived: @_onTileSetAssetReceived
      onAssetEdited: @_onTileSetAssetEdited
      onAssetTrashed: @_onTileSetAssetTrashed

    if @tileSetAssetId?
      @client.subAsset @tileSetAssetId, 'tileSet', @tileSetSubscriber

  destroy: ->
    if @tileSetAssetId? then @client.unsubAsset @tileSetAssetId, @tileSetSubscriber
    return

  changeTileSetId: (tileSetId) ->
    @client.unsubAsset @tileSetAssetId, @tileSetSubscriber if @tileSetAssetId?
    @tileSetAssetId = tileSetId

    @tileSetAsset = null
    URL.revokeObjectURL @url if @url?
    @tileSetThreeTexture?.dispose()
    @tileSetThreeTexture = null

    @client.subAsset @tileSetAssetId, 'tileSet', @tileSetSubscriber if @tileSetAssetId?
    return

  _onTileSetAssetReceived: (assetId, asset) =>
    @tileSetAsset = asset

    if ! asset.pub.domImage?
      URL.revokeObjectURL @url if @url?
      typedArray = new Uint8Array asset.pub.image
      blob = new Blob [ typedArray ], type: 'image/*'
      @url = URL.createObjectURL blob

      asset.pub.domImage = new Image
      asset.pub.domImage.src = @url

    @tileSetThreeTexture?.dispose()
    @tileSetThreeTexture = new SupEngine.THREE.Texture asset.pub.domImage
    @tileSetThreeTexture.magFilter = SupEngine.THREE.NearestFilter
    @tileSetThreeTexture.minFilter = SupEngine.THREE.NearestFilter

    setupTileSetTexture = =>
      @tileSetRenderer.setTileSet new TileSet(asset.pub), @tileSetThreeTexture
      @tileSetRenderer.gridRenderer.setGrid
        width: asset.pub.domImage.width / asset.pub.gridSize
        height: asset.pub.domImage.height / asset.pub.gridSize
        direction: -1
        orthographicScale: 10
        ratio: 1

      @receiveAssetCallbacks?.tileSet(); return

    if asset.pub.domImage.complete then setupTileSetTexture(); return

    onImageLoaded = =>
      asset.pub.domImage.removeEventListener 'load', onImageLoaded
      @tileSetThreeTexture.needsUpdate = true
      setupTileSetTexture(); return

    asset.pub.domImage.addEventListener 'load', onImageLoaded
    return

  _onTileSetAssetEdited: (id, command, args...) =>
    @__proto__["_onEditCommand_#{command}"]?.apply( @, args )
    @editAssetCallbacks?.tileSet[command]? args...
    return

  _onEditCommand_upload: ->
    URL.revokeObjectURL @url if @url?
    typedArray = new Uint8Array @tileSetAsset.pub.image
    blob = new Blob [ typedArray ], type: 'image/*'
    @url = URL.createObjectURL blob

    image = @tileSetThreeTexture.image
    image.src = @url
    image.addEventListener 'load', =>
      @tileSetThreeTexture.needsUpdate = true
      @tileSetRenderer.setTileSet new TileSet(@tileSetAsset.pub), @tileSetThreeTexture

      width = @tileSetThreeTexture.image.width / @tileSetAsset.pub.gridSize
      height = @tileSetThreeTexture.image.height / @tileSetAsset.pub.gridSize
      @tileSetRenderer.gridRenderer.resize width, height
      return
    return

  _onEditCommand_setProperty: (key, value) ->
    switch key
      when 'gridSize'
        @tileSetRenderer.refreshScaleRatio()

        width = @tileSetThreeTexture.image.width / @tileSetAsset.pub.gridSize
        height = @tileSetThreeTexture.image.height / @tileSetAsset.pub.gridSize
        @tileSetRenderer.gridRenderer.resize width, height
        return

  _onTileSetAssetTrashed: =>
    @tileSetRenderer.setTileSet null
    if @editAssetCallbacks?
      # FIXME: We should probably have a @trashAssetCallback instead
      # and let editors handle things how they want
      SupClient.onAssetTrashed()
    return
