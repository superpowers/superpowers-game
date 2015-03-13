THREE = SupEngine.THREE

module.exports = class SpriteRendererUpdater

  constructor: (@client, @spriteRenderer, config) ->
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

      typedArray = new Uint8Array asset.pub.image
      blob = new Blob [ typedArray ], type: 'image/*'
      # FIXME: Store and call URL.revokeObjectURL when changing texture
      url = URL.createObjectURL blob
      image.src = url

    if ! image.complete
      image.addEventListener 'load', =>
        asset.pub.texture.needsUpdate = true
        @spriteRenderer.setSprite asset.pub
        @_playAnimation() if @animationId?
        return
    else
      @spriteRenderer.setSprite asset.pub
      @_playAnimation() if @animationId?
    return

  _playAnimation: ->
    animation = @spriteAsset.animations.byId[@animationId]
    return if ! animation?

    @spriteRenderer.setAnimation animation.name
    return

  _onSpriteAssetEdited: =>
    # TODO: Update the sprite live
    return

  _onSpriteAssetTrashed: =>
    # TODO: Remove the sprite somehow
    return

  onConfigEdited: (path, value) ->
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
