THREE = SupEngine.THREE

module.exports = class SpriteRenderer extends SupEngine.ActorComponent

  @Updater: require './SpriteRendererUpdater'

  constructor: (actor, spriteAsset) ->
    super actor, 'SpriteRenderer'

    @opacity = 1
    @color = { r: 1, g: 1, b: 1}
    @setSprite spriteAsset if spriteAsset?

  setSprite: (asset) ->
    @_clearMesh() if @asset?
    @asset = asset

    @animationName = null
    @animationsByName = {}
    return if ! @asset?

    @updateAnimationsByName()

    geometry = new THREE.PlaneBufferGeometry @asset.grid.width, @asset.grid.height
    material = new THREE.MeshBasicMaterial map: @asset.texture, alphaTest: @asset.alphaTest, side: THREE.DoubleSide, transparent: true, opacity: @opacity
    material.color.setRGB @color.r, @color.g, @color.b
    @threeMesh = new THREE.Mesh geometry, material

    scaleRatio = 1 / @asset.pixelsPerUnit
    @threeMesh.scale.set scaleRatio, scaleRatio, scaleRatio
    @threeMesh.position.setX (0.5 - @asset.origin.x) * @asset.grid.width * scaleRatio
    @threeMesh.position.setY (0.5 - @asset.origin.y) * @asset.grid.height * scaleRatio

    @setFrame 0
    @actor.threeObject.add @threeMesh
    @threeMesh.updateMatrixWorld()
    return

  updateAnimationsByName: ->
    @animationsByName = {}
    @animationsByName[animation.name] = animation for animation in @asset.animations
    return

  _clearMesh: ->
    @actor.threeObject.remove @threeMesh
    @threeMesh.traverse (obj) -> obj.dispose?(); return
    @threeMesh = null
    return

  _destroy: ->
    @_clearMesh() if @asset?
    @asset = null
    super()
    return

  setFrame: (frame) ->
    framesPerRow = Math.floor @threeMesh.material.map.image.width / @asset.grid.width
    frameX = frame % framesPerRow
    frameY = Math.floor(frame / framesPerRow)

    left   = (frameX     * @asset.grid.width) / @threeMesh.material.map.image.width
    right  = ((frameX+1) * @asset.grid.width) / @threeMesh.material.map.image.width
    bottom = (@threeMesh.material.map.image.height - (frameY+1) * @asset.grid.height) / @threeMesh.material.map.image.height
    top    = (@threeMesh.material.map.image.height - frameY     * @asset.grid.height) / @threeMesh.material.map.image.height

    uvs = @threeMesh.geometry.getAttribute('uv')
    uvs.needsUpdate = true

    uvs.array[0] = left ; uvs.array[1] = top
    uvs.array[2] = right; uvs.array[3] = top
    uvs.array[4] = left ; uvs.array[5] = bottom
    uvs.array[6] = right; uvs.array[7] = bottom
    return

  setAnimation: (newAnimationName, newAnimationLooping=true) ->
    if newAnimationName?
      if ! @animationsByName[newAnimationName]? then throw new Error "Animation #{newAnimationName} doesn't exist"
      return if newAnimationName == @animationName and @isAnimationPlaying

      @animationName = newAnimationName
      @animationLooping = newAnimationLooping
      @animationTimer = 0
      @isAnimationPlaying = true
    else
      @animationName = null
      @setFrame 0
    return

  getAnimation: -> @animationName

  setAnimationTime: (time) ->
    if typeof time != 'number' then throw new Error "Time must be an integer"
    if time < 0 or time > @getAnimationDuration() then throw new Error "Time must be between 0 and #{@getAnimationDuration()}"
    @animationTimer = time * SupEngine.GameInstance.framesPerSecond
    @updateFrame()
    return

  getAnimationTime: -> if @animationName? then @animationTimer / SupEngine.GameInstance.framesPerSecond else 0

  getAnimationDuration: ->
    if @animationName?
      animation = @animationsByName[@animationName]
      return(animation.endFrameIndex - animation.startFrameIndex + 1) / @asset.framesPerSecond

    return 0

  playAnimation: (@animationLooping=true) -> @isAnimationPlaying = true; return
  pauseAnimation: -> @isAnimationPlaying = false; return

  stopAnimation: ->
    return if ! @animationName?

    @isAnimationPlaying = false
    @animationTimer = 0
    @updateFrame()
    return

  updateFrame: ->
    animation = @animationsByName[@animationName]
    frame = animation.startFrameIndex + Math.max(1, Math.ceil(@animationTimer / SupEngine.GameInstance.framesPerSecond * @asset.framesPerSecond)) - 1
    if frame > animation.endFrameIndex
      if @animationLooping
        frame = animation.startFrameIndex
        @animationTimer = 1
      else
        frame = animation.endFrameIndex
        @isAnimationPlaying = false

    @setFrame frame
    return

  update: ->
    return if ! @animationName? or ! @isAnimationPlaying

    @animationTimer += 1
    @updateFrame()
    return
