SupEngine = require '../'

module.exports = class Camera2DControls extends SupEngine.ActorComponent

  constructor: (actor, @camera, @options, @zoomCallback) ->
    super actor, 'Camera2DControls'
    @multiplier = 1

  setMultiplier: (newMultiplier) ->
    newOrthographicScale = @camera.orthographicScale * @multiplier
    @multiplier = newMultiplier / 10

    cameraPosition = @camera.actor.getLocalPosition()
    [x, y] = @getScreenPosition cameraPosition.x, cameraPosition.y
    @changeOrthographicScale newOrthographicScale, x, y
    return

  changeOrthographicScale: (newOrthographicScale, x, y) ->
    [startX, startY] = @getScenePosition x, y
    @camera.setOrthographicScale newOrthographicScale / @multiplier
    [endX, endY] = @getScenePosition x, y

    @camera.actor.moveLocal new SupEngine.THREE.Vector3 startX - endX, endY - startY, 0
    @zoomCallback?()
    return

  update: ->
    # Zoom
    if @actor.gameInstance.input.mouseButtons[5].isDown
      newOrthographicScale = Math.max @options.zoomMin, @camera.orthographicScale * @multiplier / @options.zoomSpeed

    if @actor.gameInstance.input.mouseButtons[6].isDown
      newOrthographicScale = Math.min @options.zoomMax, @camera.orthographicScale * @multiplier * @options.zoomSpeed

    if newOrthographicScale? and newOrthographicScale != @camera.orthographicScale
      mousePosition = @actor.gameInstance.input.mousePosition
      @changeOrthographicScale newOrthographicScale, mousePosition.x, mousePosition.y

    # Move
    if @actor.gameInstance.input.mouseButtons[1].isDown
      mouseDelta = @actor.gameInstance.input.mouseDelta
      mouseDelta.x /= @actor.gameInstance.threeRenderer.domElement.width
      mouseDelta.x *= @camera.orthographicScale * @camera.cachedRatio

      mouseDelta.y /= @actor.gameInstance.threeRenderer.domElement.height
      mouseDelta.y *= @camera.orthographicScale

      if mouseDelta.x != 0 or mouseDelta.y != 0
        cameraPosition = @camera.actor.moveLocal new SupEngine.THREE.Vector3 -mouseDelta.x, mouseDelta.y, 0
    return

  getScreenPosition: (x, y) ->
    x /= @camera.orthographicScale / 2 * @camera.cachedRatio
    x = (1-x) / 2
    x *= @actor.gameInstance.threeRenderer.domElement.width

    y /= @camera.orthographicScale / 2
    y = (y+1) / 2
    y *= @actor.gameInstance.threeRenderer.domElement.height
    return [x, y]

  getScenePosition: (x, y)->
    cameraPosition = @camera.actor.getLocalPosition()

    x /= @actor.gameInstance.threeRenderer.domElement.width
    x = x * 2 - 1
    x *= @camera.orthographicScale / 2 * @camera.cachedRatio
    x += cameraPosition.x

    y /= @actor.gameInstance.threeRenderer.domElement.height
    y = y * 2 - 1
    y *= @camera.orthographicScale / 2
    y -= cameraPosition.y
    return [x, y]
