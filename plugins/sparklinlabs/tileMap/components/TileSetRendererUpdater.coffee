TileSet = require './TileSet'

module.exports = class TileSetRendererUpdater

  constructor: (@client, @tileSetRenderer, config, @receiveAssetCallbacks, @editAssetCallbacks) ->
    @tileSetAssetId = config.tileSetAssetId
    @tileSetAsset = null

    @tileSetSubscriber =
      onAssetReceived: @_onTileSetAssetReceived
      onAssetEdited: @_onTileSetAssetEdited
      onAssetTrashed: @_onTileSetAssetTrashed

    if @tileSetAssetId?
      @client.sub @tileSetAssetId, 'tileSet', @tileSetSubscriber

  _onTileSetAssetReceived: (assetId, asset) =>
    @tileSetAsset = asset

    image = asset.pub.texture?.image

    if ! image?
      image = new Image

      asset.pub.texture = new SupEngine.THREE.Texture image
      asset.pub.texture.magFilter = SupEngine.THREE.NearestFilter
      asset.pub.texture.minFilter = SupEngine.THREE.NearestFilter

      URL.revokeObjectURL @url if @url?

      typedArray = new Uint8Array asset.pub.image
      blob = new Blob [ typedArray ], type: 'image/*'

      @url = URL.createObjectURL blob
      image.src = @url

    if ! image.complete
      onImageLoaded = =>
        image.removeEventListener 'load', onImageLoaded
        asset.pub.texture.needsUpdate = true
        @tileSetRenderer.setTileSet new TileSet asset.pub
        @tileSetRenderer.gridRenderer.setGrid
          width: asset.pub.texture.image.width / asset.pub.gridSize
          height: asset.pub.texture.image.height / asset.pub.gridSize
          direction: -1
          orthographicScale: 10
          ratio: 1

        @receiveAssetCallbacks?.tileSet();
        return

      image.addEventListener 'load', onImageLoaded
    else
      @tileSetRenderer.setTileSet new TileSet asset.pub
      @tileSetRenderer.gridRenderer.setGrid
        width: asset.pub.texture.image.width / asset.pub.gridSize
        height: asset.pub.texture.image.height / asset.pub.gridSize
        direction: -1
        orthographicScale: 10
        ratio: 1

      @receiveAssetCallbacks?.tileSet();
    return
    return

  _onTileSetAssetEdited: (id, command, args...) =>
    @__proto__["_onEditCommand_#{command}"]?.apply( @, args )
    @editAssetCallbacks?.tileSet[command]? args...
    return

  _onEditCommand_setProperty: (key, value) ->
    switch key
      when 'gridSize'
        @tileSetRenderer.refreshScaleRatio()

        width = @tileSetAsset.pub.texture.image.width / @tileSetAsset.pub.gridSize
        height = @tileSetAsset.pub.texture.image.height / @tileSetAsset.pub.gridSize
        @tileSetRenderer.gridRenderer.resize width, height
        return

  _onTileSetAssetTrashed: =>
    @tileSetRenderer.setTileSet null
    if @editAssetCallbacks?
      SupClient.onAssetTrashed()
    return
