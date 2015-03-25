SupEngine = require '../'

tmpMovement = new SupEngine.THREE.Vector3
tmpQuaternion = new SupEngine.THREE.Quaternion
forwardVector = new SupEngine.THREE.Vector3(0, 1, 0)

module.exports = class Camera3DControls extends SupEngine.ActorComponent

  constructor: (actor, @camera) ->
    super actor, 'Camera3DControls'

    @rotation = actor.getLocalEulerAngles()

  update: ->
    movementSpeed = 0.1

    keyButtons = @actor.gameInstance.input.keyboardButtons

    tmpMovement.setX(
      if keyButtons[window.KeyEvent.DOM_VK_A].isDown or keyButtons[window.KeyEvent.DOM_VK_Q].isDown then -movementSpeed
      else if keyButtons[window.KeyEvent.DOM_VK_D].isDown then movementSpeed
      else 0 )

    tmpMovement.setZ(
      if keyButtons[window.KeyEvent.DOM_VK_W].isDown or keyButtons[window.KeyEvent.DOM_VK_Z].isDown then -movementSpeed
      else if keyButtons[window.KeyEvent.DOM_VK_S].isDown then movementSpeed
      else 0 )

    tmpMovement.setY(
      if keyButtons[window.KeyEvent.DOM_VK_SPACE].isDown then movementSpeed
      else if keyButtons[window.KeyEvent.DOM_VK_SHIFT].isDown then -movementSpeed
      else 0 )

    tmpMovement.applyQuaternion tmpQuaternion.setFromAxisAngle forwardVector, @rotation.y
    @actor.moveLocal tmpMovement

    # Camera rotation
    if @actor.gameInstance.input.mouseButtons[1].isDown or
    (@actor.gameInstance.input.mouseButtons[0].isDown and keyButtons[window.KeyEvent.DOM_VK_ALT].isDown)
      @rotation.x -= @actor.gameInstance.input.mouseDelta.y / 250
      @rotation.y -= @actor.gameInstance.input.mouseDelta.x / 250
      @actor.setLocalEulerAngles @rotation
    return
