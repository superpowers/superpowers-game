async = require 'async'
THREE = SupEngine.THREE

module.exports = class ModelRendererUpdater

  constructor: (@client, @modelRenderer, config, @receiveAssetCallbakcs, @editAssetCallbacks) ->
    @modelAssetId = config.modelAssetId
    @animationId = config.animationId
    @modelAsset = null
    @mapObjectURLs = {}

    @modelSubscriber =
      onAssetReceived: @_onModelAssetReceived
      onAssetEdited: @_onModelAssetEdited
      onAssetTrashed: @_onModelAssetTrashed

    if @modelAssetId?
      @client.sub @modelAssetId, 'model', @modelSubscriber

  _onModelAssetReceived: (assetId, asset) =>
    @modelAsset = asset
    @_prepareMaps =>
      @modelRenderer.setModel @modelAsset.pub
      @_playAnimation() if @animationId?

      @receiveAssetCallbakcs?.model();
      return
    return

  _prepareMaps: (callback) =>
    @modelAsset.pub.textures = {}

    for key, url in @mapObjectURLs
      URL.revokeObjectURL @mapObjectURLs[key]
      delete @mapObjectURLs[key]

    async.each Object.keys(@modelAsset.pub.maps), (key, cb) =>
      buffer = @modelAsset.pub.maps[key]
      if ! buffer? then cb(); return

      texture = @modelAsset.pub.textures[key]
      image = texture?.image

      if ! image?
        image = new Image
        texture = @modelAsset.pub.textures[key] = new THREE.Texture image

        typedArray = new Uint8Array buffer
        blob = new Blob [ typedArray ], type: 'image/*'
        image.src = @mapObjectURLs[key] = URL.createObjectURL blob

      if ! image.complete
        image.addEventListener 'load', => texture.needsUpdate = true; cb(); return
      else
        cb(); return
      return
    , callback
    return

  _playAnimation: ->
    animation = @modelAsset.animations.byId[@animationId]
    return if ! animation?

    @modelRenderer.setAnimation animation.name
    return

  _onModelAssetEdited: (id, command, args...) =>
    @__proto__["_onEditCommand_#{command}"]?.apply( @, args )
    @editAssetCallbacks?.model[command]? args...
    return

  _onEditCommand_setAttributes: ->
    @modelRenderer.setModel @modelAsset.pub
    @_playAnimation() if @animationId?
    return

  _onEditCommand_setMaps: (maps) ->
     # TODO: Only update the maps that changed, don't recreate the whole model
    @_prepareMaps =>
      @modelRenderer.setModel @modelAsset.pub
      @_playAnimation() if @animationId?
      return
    return

  _onEditCommand_newAnimation: (animation, index) ->
    @modelRenderer.animationsByName[animation.name] = animation
    @_playAnimation()
    return

  _onEditCommand_deleteAnimation: (id) ->
    for name, animation of @modelRenderer.animationsByName
      if animation.id == id
        delete @modelRenderer.animationsByName[animation.name]
        break
    @_playAnimation()
    return

  _onEditCommand_setAnimationProperty = (id, key, value) ->
    animationElt = ui.animationsTreeView.treeRoot.querySelector("[data-id='#{id}']")

    switch key
      when 'name'
        for name, animation of @modelRenderer.animationsByName
          if animation.id == id
            delete @modelRenderer.animationsByName[name]
            @modelRenderer.animationsByName[value] = animation
            break
    @_playAnimation()
    return

  _onModelAssetTrashed: =>
    @modelRenderer.setModel null
    if @editAssetCallbacks?
      SupClient.onAssetTrashed()
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

      when 'animationId'
        @animationId = value

        if @modelAsset?
          if @animationId? then @_playAnimation()
          else @modelRenderer.setAnimation(null)

    return
