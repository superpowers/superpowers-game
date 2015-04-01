THREE = SupEngine.THREE

module.exports = class SpriteRendererUpdater

  constructor: (@client, @spriteRenderer, config, @receiveAssetCallbakcs, @editAssetCallbacks) ->
    @spriteAssetId = config.spriteAssetId
    @animationId = config.animationId
    @spriteAsset = null

    @spriteSubscriber =
      onAssetReceived: @_onSpriteAssetReceived
      onAssetEdited: @_onSpriteAssetEdited
      onAssetTrashed: @_onSpriteAssetTrashed

    if @spriteAssetId?
      @client.sub @spriteAssetId, 'sprite', @spriteSubscriber

  _onSpriteAssetReceived: (assetId, asset) =>
    @spriteAsset = asset

    image = asset.pub.texture?.image
    if ! image?
      image = new Image

      asset.pub.texture = new THREE.Texture image
      if asset.pub.filtering == 'pixelated'
        asset.pub.texture.magFilter = THREE.NearestFilter
        asset.pub.texture.minFilter = THREE.NearestFilter

      URL.revokeObjectURL @url if @url?

      typedArray = new Uint8Array asset.pub.image
      blob = new Blob [ typedArray ], type: 'image/*'
      @url = URL.createObjectURL blob
      image.src = @url

    if ! image.complete
      onImageLoaded = =>
        image.removeEventListener 'load', onImageLoaded
        asset.pub.texture.needsUpdate = true
        @spriteRenderer.setSprite asset.pub
        @_playAnimation() if @animationId?

        @receiveAssetCallbakcs?.sprite( @url );
        return

      image.addEventListener 'load', onImageLoaded
    else
      @spriteRenderer.setSprite asset.pub
      @_playAnimation() if @animationId?

      @receiveAssetCallbakcs?.sprite( @url );
    return

  _playAnimation: ->
    animation = @spriteAsset.animations.byId[@animationId]
    return if ! animation?

    @spriteRenderer.setAnimation animation.name
    return

  _onSpriteAssetEdited: (id, command, args...) =>
    callEditCallback = true
    if @__proto__["_onEditCommand_#{command}"]?
      callEditCallback = false if @__proto__["_onEditCommand_#{command}"].apply( @, args ) == false

    @editAssetCallbacks?.sprite[command]? args... if callEditCallback
    return

  _onEditCommand_upload: ->
    URL.revokeObjectURL @url if @url?

    typedArray = new Uint8Array @spriteAsset.pub.image
    blob = new Blob [ typedArray ], type: 'image/*'
    @url = URL.createObjectURL blob
    image = @spriteAsset.pub.texture.image
    image.src = @url
    image.addEventListener 'load', =>
      @spriteAsset.pub.texture.needsUpdate = true
      return

    @editAssetCallbacks?.sprite.upload @url
    return false

  _onEditCommand_setProperty: (path, value) ->
    @spriteRenderer.setSprite @spriteAsset.pub
    @_playAnimation() if @animationId?
    return

  _onEditCommand_newAnimation: ->
    @spriteRenderer.updateAnimationsByName()
    @_playAnimation()
    return

  _onEditCommand_deleteAnimation: ->
    @spriteRenderer.updateAnimationsByName()
    @_playAnimation()
    return

  _onEditCommand_setAnimationProperty: ->
    @spriteRenderer.updateAnimationsByName()
    @_playAnimation()
    return

  _onSpriteAssetTrashed: =>
    @spriteRenderer.setSprite null
    if @editAssetCallbacks?
      SupClient.onAssetTrashed()
    return

  config_setProperty: (path, value) ->
    switch path
      when 'spriteAssetId'
        @client.unsub @spriteAssetId, @spriteSubscriber if @spriteAssetId?
        @spriteAssetId = value

        @spriteAsset = null
        @spriteRenderer.setSprite null

        if @spriteAssetId?
          @client.sub @spriteAssetId, 'sprite', @spriteSubscriber

      when 'animationId'
        @animationId = value

        if @spriteAsset?
          if @animationId? then @_playAnimation()
          else @spriteRenderer.setAnimation(null)
    return
