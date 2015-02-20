tmpVector3 = new SupEngine.THREE.Vector3()
tmpQuaternion = new SupEngine.THREE.Quaternion()
tmpEuler = new SupEngine.THREE.Euler()

degToRad = Math.PI / 180
radToDeg = 180 / Math.PI

module.exports = (player) ->
  'log': console.log.bind console

  'Math':
    'random': (min, max) -> Math.floor(Math.random() * (max + 1 - min)) + min

    'cos': (degrees) -> Math.cos degrees * degToRad
    'sin': (degrees) -> Math.sin degrees * degToRad
    'atan2': (y, x) ->  Math.atan2(y, x) * radToDeg
    'deg': (radians) -> radians * radToDeg
    'rad': (degrees) -> degrees * degToRad
    'pi': Math.PI

    'abs': Math.abs
    'sign': Math.sign
    'round': Math.round
    'floor': Math.floor
    'ceil': Math.ceil

    'sqrt': Math.sqrt
    'pow': Math.pow

    'lerp': (a, b, v) -> a + (b - a) * v

    'max': Math.max
    'min': Math.min
    'clamp': (v, min, max) -> Math.max min, Math.min(max, v)

  'Sup':
    'destroyAllActors': ->
      player.gameInstance.destroyAllActors()
      player.gameInstance.tree.walkTopDown (actor) => actor.__outer.__inner = null; actor.__outer = null; return
      return

    'get': (path) -> player.getOuterAsset(player.entriesByPath[path]?.id) ? null

    'getActor': (name) ->
      foundActor = null
      player.gameInstance.tree.walkTopDown (actor) =>
        foundActor ?= actor.__outer if actor.name == name
        return
      foundActor

    'Actor':
      'construct': (@name, outerParentActor=null) ->
        actor = new SupEngine.Actor player.gameInstance, @name, outerParentActor?.__inner
        @__inner = actor
        actor.__outer = @
        return

      'prototype':
        'destroy': ->
          player.gameInstance.destroyActor @__inner
          @__inner.__outer = null
          @__inner = null
          return

        'getName': -> @name
        'setName': (@name) ->

        'getVisible': -> @__inner.threeObject.visible
        'setVisible': (visible) -> @__inner.threeObject.visible = visible; return

        'getParent': -> @__inner.parent?.__outer ? null
        'setParent': (outerParent) -> @__inner.setParent outerParent?.__inner

        'getChild': (name) ->
          foundActor = null
          player.gameInstance.tree.walkDown @__inner, (actor) =>
            foundActor ?= actor.__outer if actor.name == name and actor.__outer?
            return
          foundActor

        'getChildren': -> ( child.__outer for child in @__inner.children when child.__outer? )

        'getPosition': ->
          position = @__inner.getGlobalPosition()
          return new player.scriptRoot.Math.Vector3 position.x, position.y, position.z
        'setPosition': (position) ->
          tmpVector3.set position.x, position.y, position.z
          @__inner.setGlobalPosition tmpVector3
          return

        'getLocalPosition': ->
          position = @__inner.getLocalPosition()
          return new player.scriptRoot.Math.Vector3 position.x, position.y, position.z
        'setLocalPosition': (position) ->
          tmpVector3.set position.x, position.y, position.z
          @__inner.setLocalPosition tmpVector3
          return

        'move': (offset) ->
          tmpVector3.set offset.x, offset.y, offset.z
          @__inner.moveGlobal tmpVector3
          return
        'moveLocal': (offset) ->
          tmpVector3.set offset.x, offset.y, offset.z
          @__inner.moveLocal tmpVector3
          return

        'getOrientation': ->
          orientation = @__inner.getGlobalOrientation()
          return new player.scriptRoot.Math.Quaternion orientation.x, orientation.y, orientation.z, orientation.w
        'setOrientation': (quaternion) ->
          tmpQuaternion.set quaternion.x, quaternion.y, quaternion.z, quaternion.w
          @__inner.setGlobalOrientation tmpQuaternion
          return

        'getLocalOrientation': ->
          orientation = @__inner.getLocalOrientation()
          return new player.scriptRoot.Math.Quaternion orientation.x, orientation.y, orientation.z, orientation.w
        'setLocalOrientation': (quaternion) ->
          tmpQuaternion.set quaternion.x, quaternion.y, quaternion.z, quaternion.w
          @__inner.setLocalOrientation tmpQuaternion
          return

        'getEulerAngles': ->
          eulerAngles = @__inner.getGlobalEulerAngles()
          x = eulerAngles.x * radToDeg
          y = eulerAngles.y * radToDeg
          z = eulerAngles.z * radToDeg
          return new player.scriptRoot.Math.Vector3 parseFloat(x.toFixed(3)), parseFloat(y.toFixed(3)), parseFloat(z.toFixed(3))
        'setEulerAngles': (eulerAngles) ->
          tmpEuler.set eulerAngles.x * degToRad, eulerAngles.y * degToRad, eulerAngles.z * degToRad
          @__inner.setGlobalEulerAngles tmpEuler
          return

        'getLocalEulerAngles': ->
          eulerAngles = @__inner.getLocalEulerAngles()
          x = eulerAngles.x * radToDeg
          y = eulerAngles.y * radToDeg
          z = eulerAngles.z * radToDeg
          return new player.scriptRoot.Math.Vector3 parseFloat(x.toFixed(3)), parseFloat(y.toFixed(3)), parseFloat(z.toFixed(3))
        'setLocalEulerAngles': (eulerAngles) ->
          tmpEuler.set eulerAngles.x * degToRad, eulerAngles.y * degToRad, eulerAngles.z * degToRad
          @__inner.setLocalEulerAngles tmpEuler
          return

        'rotate': (offset) ->
          tmpQuaternion.set offset.x, offset.y, offset.z, offset.w
          @__inner.rotateGlobal tmpQuaternion
          return

        'rotateLocal': (offset) ->
          tmpQuaternion.set offset.x, offset.y, offset.z, offset.w
          @__inner.rotateLocal tmpQuaternion
          return

        'lookAt': (target) ->
          tmpVector3.set target.x, target.y, target.z
          @__inner.lookAt tmpVector3
          return

        'lookTowards': (direction) ->
          tmpVector3.set direction.x, direction.y, direction.z
          @__inner.lookTowards tmpVector3
          return

        'getLocalScale': ->
          scale = @__inner.getLocalScale()
          return new player.scriptRoot.Math.Vector3 scale.x, scale.y, scale.z
        'setLocalScale': (scale) ->
          tmpVector3.set scale.x, scale.y, scale.z
          @__inner.setLocalScale tmpVector3
          return


        'addBehavior': (behaviorBlueprint, properties) ->
          behavior = new behaviorBlueprint @
          behavior[propertyName] = value for propertyName, value of properties if properties?
          behavior.__inner.awake()
          behavior

    'ActorComponent':
      'construct': (@actor) ->
        return

      'prototype':
        'destroy': ->
          player.gameInstance.destroyComponent @__inner
          return

    'Camera':
      'construct': (actor)->
        @__inner = new SupEngine.componentPlugins.Camera @actor.__inner
        @actor.camera = @
        @__inner.__outer = @
        return

      'prototype':
        'setOrthographicMode': (enabled) ->
          @__inner.setOrthographicMode enabled
          return

        'setOrthographicScale': (scale) ->
          @__inner.setOrthographicScale scale
          return
        'getOrthographicScale': -> @__inner.orthographicScale

    'Behavior':
      'construct': (actor) ->
        @__inner = new SupEngine.componentPlugins.Behavior actor.__inner, {
          awake: @awake?.bind @
          start: @start?.bind @
          update: @update?.bind @
        }
        @__inner.__outer = @
        return

  'Input':
    'getScreenSize': ->
      return { x: player.canvas.clientWidth, y: player.canvas.clientHeight }

    'getMousePosition': ->
      mousePos = player.gameInstance.input.mousePosition
      return { x: mousePos.x / player.canvas.clientWidth * 2 - 1, y: (mousePos.y / player.canvas.clientHeight * 2 - 1) * -1 }

    'getMouseDelta': ->
      mouseDelta = player.gameInstance.input.mouseDelta
      return { x: mouseDelta.x, y: -mouseDelta.y }

    'isMouseButtonDown': (button) ->
      return player.gameInstance.input.mouseButtons[button].isDown

    'wasMouseButtonJustPressed': (button) ->
      return player.gameInstance.input.mouseButtons[button].wasJustPressed

    'wasMouseButtonJustReleased': (button) ->
      return player.gameInstance.input.mouseButtons[button].wasJustReleased

    'getTouchPosition': (index) ->
      position = player.gameInstance.input.touches[index].position
      return { x: position.x / player.canvas.clientWidth * 2 - 1, y: (position.y / player.canvas.clientHeight * 2 - 1) * -1 }

    'isTouchDown': (index) ->
      return player.gameInstance.input.touches[index].isDown

    'wasTouchStarted': (index) ->
      return player.gameInstance.input.touches[index].wasStarted

    'wasTouchEnded': (index) ->
      return player.gameInstance.input.touches[index].wasReleased

    'vibrate': (pattern) -> window.navigator.vibrate(pattern); return

    'isKeyDown': (keyName) ->
      key = window.KeyEvent["DOM_VK_" + keyName ]
      return player.gameInstance.input.keyboardButtons[key].isDown

    'wasKeyJustPressed': (keyName) ->
      key = window.KeyEvent["DOM_VK_" + keyName ]
      return player.gameInstance.input.keyboardButtons[key].wasJustPressed

    'wasKeyJustReleased': (keyName) ->
      key = window.KeyEvent["DOM_VK_" + keyName ]
      return player.gameInstance.input.keyboardButtons[key].wasJustReleased

    'isGamepadButtonDown': (gamepad, key) ->
      return player.gameInstance.input.gamepadsButtons[gamepad][key].isDown

    'wasGamepadButtonJustPressed': (gamepad, key) ->
      return player.gameInstance.input.gamepadsButtons[gamepad][key].wasJustPressed

    'wasGamepadButtonJustReleased': (gamepad, key) ->
      return player.gameInstance.input.gamepadsButtons[gamepad][key].wasJustReleased

    'getGamepadAxisValue': (gamepad, axis) ->
      return player.gameInstance.input.gamepadsAxes[gamepad][axis]

  'Storage':
    'set': (key, value) -> localStorage.setItem key, value; return
    'get': (key) -> localStorage.getItem key
    'remove': (key) -> localStorage.removeItem key; return
    'clear': -> localStorage.clear()
