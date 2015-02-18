THREE = SupEngine.THREE
TileMap = require './TileMap'
TileSet = require './TileSet'

module.exports = class TileMapRendererUpdater

  constructor: (@client, @tileMapRenderer, config) ->
    @tileMapAssetId = config.tileMapAssetId
    @tileMapAsset = null

    # @tileSetAssetId = config.tileSetAssetId
    @tileSetAsset = null

    @tileMapSubscriber =
      onAssetReceived: @_onTileMapAssetReceived
      onAssetEdited: @_onTileMapAssetEdited
      onAssetTrashed: @_onTileMapAssetTrashed

    @tileSetSubscriber =
      onAssetReceived: @_onTileSetAssetReceived
      onAssetEdited: @_onTileSetAssetEdited
      onAssetTrashed: @_onTileSetAssetTrashed

    if @tileMapAssetId?
      @client.sub @tileMapAssetId, 'tileMap', @tileMapSubscriber

  _onTileMapAssetReceived: (assetId, asset) =>
    @tileMapAsset = asset
    @tileMapRenderer.setTileMap new TileMap @tileMapAsset.pub

    @client.sub @tileMapAsset.pub.tileSetId, 'tileSet', @tileSetSubscriber
    return

  _onTileMapAssetEdited: =>
    # TODO: Update the tileMap live
    return

  _onTileMapAssetTrashed: =>
    # TODO: Remove the tileMap somehow
    return

  _onTileSetAssetReceived: (assetId, asset) =>
    @tileSetAsset = asset

    image = asset.pub.texture?.image

    if ! image?
      image = new Image

      asset.pub.texture = new THREE.Texture image
      asset.pub.texture.magFilter = THREE.NearestFilter
      asset.pub.texture.minFilter = THREE.NearestFilter

      typedArray = new Uint8Array asset.pub.image
      blob = new Blob [ typedArray ], type: 'image/*'
      # FIXME: Store and call URL.revokeObjectURL when changing texture
      url = URL.createObjectURL blob
      image.src = url

    if ! image.complete
      image.addEventListener 'load', =>
        asset.pub.texture.needsUpdate = true
        @tileMapRenderer.setTileSet new TileSet asset.pub
        return
    else
      @tileMapRenderer.setTileSet new TileSet asset.pub
    return

  _onTileSetAssetEdited: =>
    # TODO: Update the tileMap live
    return

  _onTileSetAssetTrashed: =>
    # TODO: Remove the tileMap somehow
    return

  onConfigEdited: (path, value) ->
    switch path
      when 'tileMapAssetId'
        @client.unsub @tileMapAssetId, @tileMapSubscriber if @tileMapAssetId?
        @tileMapAssetId = value

        @tileMapAsset = null
        @tileMapRenderer.setTileMap null

        if @tileMapAssetId?
          @client.sub @tileMapAssetId, 'tileMap', @tileMapSubscriber

      # when 'tileSetAssetId'

    return
