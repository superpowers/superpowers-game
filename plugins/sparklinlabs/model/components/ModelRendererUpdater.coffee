async = require 'async'
THREE = SupEngine.THREE

module.exports = class ModelRendererUpdater

  constructor: (@client, @modelRenderer, config) ->
    @modelAssetId = config.modelAssetId
    @modelAsset = null

    @modelSubscriber =
      onAssetReceived: @_onModelAssetReceived
      onAssetEdited: @_onModelAssetEdited
      onAssetTrashed: @_onModelAssetTrashed

    if @modelAssetId?
      @client.sub @modelAssetId, 'model', @modelSubscriber

  _onModelAssetReceived: (assetId, asset) =>
    @modelAsset = asset

    asset.pub.textures ?= {}

    async.each Object.keys(asset.pub.maps), (key, cb) ->
      buffer = asset.pub.maps[key]
      if ! buffer? then cb(); return

      texture = asset.pub.textures[key]
      image = texture?.image

      if ! image?
        image = new Image
        texture = asset.pub.textures[key] = new THREE.Texture image

        typedArray = new Uint8Array buffer
        blob = new Blob [ typedArray ], type: 'image/*'
        # FIXME: Store and call URL.revokeObjectURL when changing texture
        image.src = URL.createObjectURL blob

      if ! image.complete
        image.addEventListener 'load', => texture.needsUpdate = true; cb(); return
      else
        cb(); return
      return
    , => @modelRenderer.setModel asset.pub; return

    return

  _onModelAssetEdited: =>
    # TODO: Update the model live
    return

  _onModelAssetTrashed: =>
    # TODO: Remove the model somehow
    return

  onConfigEdited: (path, value) ->
    switch path
      when 'modelAssetId'
        @client.unsub @modelAssetId, @modelSubscriber if @modelAssetId?
        @modelAssetId = value

        @modelAsset = null
        @modelRenderer.setModel null

        if @modelAssetId?
          @client.sub @modelAssetId, 'model', @modelSubscriber

    return
