THREE = SupEngine.THREE

tmpBoneMatrix = new THREE.Matrix4

module.exports = class ModelRenderer extends SupEngine.ActorComponent

  @Updater: require './ModelRendererUpdater'

  constructor: (actor, modelAsset) ->
    super actor, 'ModelRenderer'

    @setModel modelAsset if modelAsset?

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

  setModel: (asset) ->
    @_clearMesh() if @asset?
    @asset = null
    @animation = null
    @animationsByName = {}

    return if ! asset?.attributes.position?

    @asset = asset

    geometry = new THREE.BufferGeometry()

    if @asset.attributes.position?
      buffer = new Float32Array(@asset.attributes.position)
      geometry.addAttribute 'position', new THREE.BufferAttribute buffer, 3

    if @asset.attributes.index?
      buffer = new Uint16Array(@asset.attributes.index)
      geometry.addAttribute 'index', new THREE.BufferAttribute buffer, 1

    if @asset.attributes.uv?
      buffer = new Float32Array(@asset.attributes.uv)
      geometry.addAttribute 'uv', new THREE.BufferAttribute buffer, 2

    if @asset.attributes.normal?
      buffer = new Float32Array(@asset.attributes.normal)
      geometry.addAttribute 'normal', new THREE.BufferAttribute buffer, 3

    if @asset.attributes.color?
      buffer = new Float32Array(@asset.attributes.color)
      geometry.addAttribute 'color', new THREE.BufferAttribute buffer, 3

    if @asset.attributes.skinIndex?
      buffer = new Float32Array(@asset.attributes.skinIndex)
      geometry.addAttribute 'skinIndex', new THREE.BufferAttribute buffer, 4

    if @asset.attributes.skinWeight?
      buffer = new Float32Array(@asset.attributes.skinWeight)
      geometry.addAttribute 'skinWeight', new THREE.BufferAttribute buffer, 4

    material = new THREE.MeshBasicMaterial side: THREE.DoubleSide

    if @asset.textures.diffuse?
      material.map = @asset.textures.diffuse

    if @asset.bones?
      @threeMesh = new THREE.SkinnedMesh geometry, material

      bones = []

      for boneInfo in @asset.bones
        bone = new THREE.Bone @threeMesh
        bone.name = boneInfo.name
        bone.applyMatrix tmpBoneMatrix.fromArray(boneInfo.matrix)
        bones.push bone

      for boneInfo, i in @asset.bones
        if boneInfo.parentIndex? then bones[boneInfo.parentIndex].add bones[i]
        else @threeMesh.add bones[i]

      @threeMesh.updateMatrixWorld true
      useVertexTexture = false
      @threeMesh.bind new THREE.Skeleton bones, undefined, useVertexTexture
      @threeMesh.material.skinning = true

      # TODO: Allow toggling in it in the user interface
      ###
      @skeletonHelper = new THREE.SkeletonHelper @threeMesh
      @skeletonHelper.material.linewidth = 3
      @threeMesh.add @skeletonHelper
      @skeletonHelper.updateMatrixWorld()
      ###

      @animationsByName[animation.name] = animation for animation in @asset.animations

    else
      @threeMesh = new THREE.Mesh geometry, material

    @actor.threeObject.add @threeMesh
    @threeMesh.updateMatrixWorld()

    return

  setAnimation: (newAnimationName, newAnimationLooping=true) ->
    if newAnimationName?
      newAnimation = @animationsByName[newAnimationName]
      if ! newAnimation? then throw new Error "Animation #{newAnimationName} doesn't exist"
      return if newAnimation == @animation and @isAnimationPlaying

      @animation = newAnimation
      @animationLooping = newAnimationLooping
      @animationTimer = 0
      @isAnimationPlaying = true
    else
      @animation = null
      @clearPose()
    return

  getAnimation: -> @animation?.name

  setAnimationTime: (time) ->
    throw new Error "Invalid time" if typeof time != 'number' and time < 0 or time > @getAnimationDuration()
    @animationTimer = time * SupEngine.GameInstance.framesPerSecond
    @updatePose()
    return

  getAnimationTime: -> if @animation? then @animationTimer / SupEngine.GameInstance.framesPerSecond else 0
  getAnimationDuration: ->  @animation?.duration ? 0

  playAnimation: (@animationLooping=true) -> @isAnimationPlaying = true; return
  pauseAnimation: -> @isAnimationPlaying = false; return

  stopAnimation: ->
    return if ! @animation?

    @isAnimationPlaying = false
    @animationTimer = 0
    @updatePose()
    return

  clearPose: ->
    for bone, i in @threeMesh.skeleton.bones
      bone.matrix.fromArray(@asset.bones[i].matrix)
      bone.matrix.decompose bone.position, bone.quaternion, bone.scale

    @threeMesh.rotation.set 0, 0, 0
    @threeMesh.updateMatrixWorld()

    @skeletonHelper?.update()
    return

  tmpVector = new THREE.Vector3
  tmpQuaternion = new THREE.Quaternion

  getInterpolationData = (keyFrames, time) ->
    prevKeyFrame = keyFrames[keyFrames.length - 1]

    # TODO: Use a cache to maintain most recently used key frames for each bone
    # and profit from temporal contiguity
    for nextKeyFrame in keyFrames
      break if nextKeyFrame.time > time
      prevKeyFrame = nextKeyFrame

    if prevKeyFrame == nextKeyFrame
      nextKeyFrame = keyFrames[0]

    timeSpan = nextKeyFrame.time - prevKeyFrame.time
    timeProgress = time - prevKeyFrame.time
    if timeSpan < 0 then console.log("timeSpan: #{timeSpan}")

    { prevKeyFrame, nextKeyFrame, t: timeProgress / timeSpan }

  updatePose: ->
    # TODO: @asset.speedMultiplier
    speedMultiplier = 1
    time = @animationTimer * speedMultiplier / SupEngine.GameInstance.framesPerSecond

    if time > @animation.duration
      if @animationLooping
        @animationTimer -= @animation.duration * SupEngine.GameInstance.framesPerSecond / speedMultiplier
        time -= @animation.duration
      else
        time = @animation.duration
        @isAnimationPlaying = false

    for bone, i in @threeMesh.skeleton.bones
      boneKeyFrames = @animation.keyFrames[bone.name]
      continue if ! boneKeyFrames?

      if boneKeyFrames.translation?
        { prevKeyFrame, nextKeyFrame, t } = getInterpolationData boneKeyFrames.translation, time
        bone.position.fromArray prevKeyFrame.value
        bone.position.lerp new THREE.Vector3().fromArray(nextKeyFrame.value), t

      if boneKeyFrames.rotation?
        { prevKeyFrame, nextKeyFrame, t } = getInterpolationData boneKeyFrames.rotation, time
        bone.quaternion.fromArray prevKeyFrame.value
        bone.quaternion.slerp new THREE.Quaternion().fromArray(nextKeyFrame.value), t

      if boneKeyFrames.scale?
        { prevKeyFrame, nextKeyFrame, t } = getInterpolationData boneKeyFrames.scale, time
        bone.scale.fromArray prevKeyFrame.value
        bone.scale.lerp new THREE.Vector3().fromArray(nextKeyFrame.value), t

    # FIXME: Work around for model animations not being oriented the right way up
    @threeMesh.rotation.set -Math.PI / 2, 0, 0
    @threeMesh.updateMatrixWorld()

    @skeletonHelper?.update()
    return

  update: ->
    return if ! @threeMesh?.skeleton?
    return if ! @animation? or @animation.duration == 0 or ! @isAnimationPlaying

    @animationTimer += 1
    @updatePose()
    return
