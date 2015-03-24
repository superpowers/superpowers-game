TileMap = require './TileMap'
TileSet = require './TileSet'

module.exports = class TileMapRendererUpdater

  constructor: (@client, @tileMapRenderer, config, @receiveAssetCallbacks, @editAssetCallbacks) ->
    @tileMapAssetId = config.tileMapAssetId
    @tileMapAsset = null

    @tileSetAssetId = config.tileSetAssetId
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

    if @tileMapAsset.pub.tileSetId?
      @client.sub @tileMapAsset.pub.tileSetId, 'tileSet', @tileSetSubscriber
    @receiveAssetCallbacks?.tileMap();
    return

  _onTileMapAssetEdited: (id, command, args...) =>
    @__proto__["_onEditCommand_#{command}"]?.apply( @, args )
    @editAssetCallbacks?.tileMap[command]? args...
    return

  _onEditCommand_changeTileSet: =>
    @client.unsub @tileSetAssetId, @tileSetSubscriber if @tileSetAssetId?
    @tileSetAsset = null
    @tileMapRenderer.setTileSet null

    @tileSetAssetId = @tileMapAsset.pub.tileSetId
    if @tileSetAssetId?
      @client.sub @tileSetAssetId, 'tileSet', @tileSetSubscriber
    return

  _onEditCommand_resizeMap: =>
    @tileMapRenderer.setTileMap new TileMap @tileMapAsset.pub
    return

  _onEditCommand_moveMap: =>
    @tileMapRenderer.refreshEntireMap()
    return

  _onEditCommand_setProperty: (path, value) =>
    switch path
      when "pixelsPerUnit" then @tileMapRenderer.refreshPixelsPerUnit()
      when "layerDepthOffset" then @tileMapRenderer.refreshLayersDepth()
    return

  _onEditCommand_editMap: (layerId, x, y) =>
    index = @tileMapAsset.pub.layers.indexOf @tileMapAsset.layers.byId[layerId]
    @tileMapRenderer.refreshTileAt index, x, y
    return

  _onEditCommand_newLayer: (layer, index) ->
    @tileMapRenderer.addLayer layer, index
    return

  _onEditCommand_deleteLayer: (id, index) ->
    @tileMapRenderer.deleteLayer index
    return

  _onEditCommand_moveLayer: (id, newIndex) ->
    @tileMapRenderer.moveLayer id, newIndex
    return

  _onTileMapAssetTrashed: =>
    @tileMapRenderer.setTileMap null
    if @editAssetCallbacks?
      SupClient.onAssetTrashed()
    return

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
      image.addEventListener 'load', =>
        asset.pub.texture.needsUpdate = true
        @tileMapRenderer.setTileSet new TileSet asset.pub
        @receiveAssetCallbacks?.tileSet();
        return
    else
      @tileMapRenderer.setTileSet new TileSet asset.pub
      @receiveAssetCallbacks?.tileSet();
    return

  _onTileSetAssetEdited: (id, command, args...) =>
    callEditCallback = true
    if @__proto__["_onTileSetEditCommand_#{command}"]?
      callEditCallback = false if @__proto__["_onTileSetEditCommand_#{command}"].apply( @, args ) == false

    @editAssetCallbacks?.tileSet[command]? args... if callEditCallback
    return

  _onTileSetEditCommand_upload: ->
    URL.revokeObjectURL @url if @url?

    typedArray = new Uint8Array @tileSetAsset.pub.image
    blob = new Blob [ typedArray ], type: 'image/*'
    @url = URL.createObjectURL blob
    image = @tileSetAsset.pub.texture.image
    image.src = @url
    image.addEventListener 'load', =>
      @tileSetAsset.pub.texture.needsUpdate = true
      @tileMapRenderer.setTileSet new TileSet @tileSetAsset.pub
      return
    return

  _onTileSetEditCommand_setProperty: ->
    @tileMapRenderer.setTileSet new TileSet @tileSetAsset.pub
    return

  _onTileSetAssetTrashed: =>
    @tileMapRenderer.setTileSet null
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
