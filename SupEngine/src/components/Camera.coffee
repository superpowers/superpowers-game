SupEngine = require '../'
THREE = SupEngine.THREE

module.exports = class Camera extends SupEngine.ActorComponent

  constructor: (actor) ->
    super actor, 'Camera'

    @fov = 45
    @orthographicScale = 10
    @halfPixelTranslationMatrix = new THREE.Matrix4()

    @viewportPosition = new THREE.Vector2 0, 0
    @viewportSize = new THREE.Vector2 1, 1

    @setOrthographicMode false

    @_computeAspectRatio()
    @actor.gameInstance.on 'resize', @_computeAspectRatio

  _destroy: ->
    @actor.gameInstance.removeListener 'resize', @_computeAspectRatio

    index = @actor.gameInstance.renderComponents.indexOf @
    @actor.gameInstance.renderComponents.splice index, 1 if index != -1

    @threeCamera = null

    super()
    return

  _computeAspectRatio: =>
    canvas = @actor.gameInstance.threeRenderer.domElement
    @cachedRatio = (canvas.width * @viewportSize.x) / (canvas.height * @viewportSize.y)
    @projectionNeedsUpdate = true
    return

  setOrthographicMode: (@isOrthographic) ->
    nearClippingPlane = 0.1
    farClippingPlane = 1000

    @threeCamera =
      if @isOrthographic then new THREE.OrthographicCamera -@orthographicScale * @cachedRatio / 2, @orthographicScale * @cachedRatio / 2, @orthographicScale / 2, -@orthographicScale / 2, nearClippingPlane, farClippingPlane
      else new THREE.PerspectiveCamera @fov, @cachedRatio, nearClippingPlane, farClippingPlane

    @projectionNeedsUpdate = true
    return

  setFOV: (@fov) ->
    if ! @isOrthographic then @projectionNeedsUpdate = true
    return

  setOrthographicScale: (@orthographicScale) ->
    if @isOrthographic then @projectionNeedsUpdate = true
    return

  setViewportPosition: (x, y) ->
    @viewportPosition.x = x
    @viewportPosition.y = y
    @projectionNeedsUpdate = true
    return

  setViewportSize: (x, y) ->
    @viewportSize.x = x
    @viewportSize.y = y
    @projectionNeedsUpdate = true
    return

  start: ->
    @actor.gameInstance.renderComponents.push @
    return

  update: ->

  render: ->
    @threeCamera.position.copy @actor.threeObject.getWorldPosition()
    @threeCamera.quaternion.copy @actor.threeObject.getWorldQuaternion()

    if @projectionNeedsUpdate
      @projectionNeedsUpdate = false
      @threeCamera.updateProjectionMatrix()

      if @isOrthographic
        @threeCamera.left = -@orthographicScale * @cachedRatio / 2
        @threeCamera.right = @orthographicScale * @cachedRatio / 2
        @threeCamera.top = @orthographicScale / 2
        @threeCamera.bottom = -@orthographicScale / 2

        # FIXME: Is it required? It's buggy at least.
        # @halfPixelTranslationMatrix.makeTranslation -0.5 / (@orthographicScale  * @cachedRatio), 0.5 / @orthographicScale, 0
        @threeCamera.updateProjectionMatrix()
        # @threeCamera.projectionMatrix.multiplyMatrices @halfPixelTranslationMatrix, @threeCamera.projectionMatrix
      else
        @threeCamera.fov = @fov
        @threeCamera.aspect = @cachedRatio
        @threeCamera.updateProjectionMatrix()

    canvas = @actor.gameInstance.threeRenderer.domElement
    @actor.gameInstance.threeRenderer.setViewport @viewportPosition.x * canvas.width, ( 1 - @viewportPosition.y - @viewportSize.y ) * canvas.height, @viewportSize.x * canvas.width, @viewportSize.y * canvas.height
    @actor.gameInstance.threeRenderer.render @actor.gameInstance.threeScene, @threeCamera
    return
