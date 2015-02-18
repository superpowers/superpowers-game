SupEngine = require '../'

module.exports = class Camera2DControls extends SupEngine.ActorComponent

  constructor: (actor, @camera, @options, @zoomCallback) ->
    super actor, 'Camera2DControls'

  update: ->
    # Zoom
    zoomed = false
    if @actor.gameInstance.input.mouseButtons[5].isDown
      newOrthographicScale = Math.max @options.zoomMin, @camera.orthographicScale - @options.zoomOffset

    if @actor.gameInstance.input.mouseButtons[6].isDown
      newOrthographicScale = Math.min @options.zoomMax, @camera.orthographicScale + @options.zoomOffset

    if newOrthographicScale? and newOrthographicScale != @camera.orthographicScale
      [startX, startY] = @getMouseScenePosition()
      @camera.setOrthographicScale newOrthographicScale
      [endX, endY] = @getMouseScenePosition()

      @camera.actor.moveLocal new SupEngine.THREE.Vector3 startX - endX, endY - startY, 0
      zoomed = true

    # Move
    if @actor.gameInstance.input.mouseButtons[1].isDown
      mouseDelta = @actor.gameInstance.input.mouseDelta
      mouseDelta.x /= @actor.gameInstance.threeRenderer.domElement.width
      mouseDelta.x *= @camera.orthographicScale * @camera.cachedRatio

      mouseDelta.y /= @actor.gameInstance.threeRenderer.domElement.height
      mouseDelta.y *= @camera.orthographicScale

      if mouseDelta.x != 0 or mouseDelta.y != 0
        cameraPosition = @camera.actor.moveLocal new SupEngine.THREE.Vector3 -mouseDelta.x, mouseDelta.y, 0

    @zoomCallback?() if zoomed
    return

  getMouseScenePosition: ->
    mousePosition = @actor.gameInstance.input.mousePosition
    position = new SupEngine.THREE.Vector3 mousePosition.x, mousePosition.y, 0
    cameraPosition = @camera.actor.getLocalPosition()

    x = position.x / @actor.gameInstance.threeRenderer.domElement.width

    x = x * 2 - 1
    x *= @camera.orthographicScale / 2 * @camera.cachedRatio
    x += cameraPosition.x

    y = position.y / @actor.gameInstance.threeRenderer.domElement.height
    y = y * 2 - 1
    y *= @camera.orthographicScale / 2
    y -= cameraPosition.y
    return [x, y]
