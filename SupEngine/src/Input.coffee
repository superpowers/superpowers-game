module.exports = class Input
  @maxTouches: 10

  constructor: (@canvas) ->
    # Mouse
    @mouseButtons = []
    @mouseButtonsDown = []

    @mousePosition    = x: 0, y: 0
    @mouseDelta       = x: 0, y: 0

    @canvas.addEventListener 'mousemove', @_onMouseMove
    @canvas.addEventListener 'mousedown', @_onMouseDown
    document.addEventListener 'mouseup', @_onMouseUp
    @canvas.addEventListener "contextmenu", @_onContextMenu
    @canvas.addEventListener 'DOMMouseScroll', @_onMouseWheel
    @canvas.addEventListener 'mousewheel', @_onMouseWheel

    # Touch
    @touches = []
    @touchesDown = []

    @canvas.addEventListener 'touchstart', @_onTouchStart
    @canvas.addEventListener 'touchend', @_onTouchEnd
    @canvas.addEventListener 'touchmove', @_onTouchMove

    # Keyboard
    @keyboardButtons = []
    @keyboardButtonsDown = []

    @canvas.addEventListener 'keydown', @_onKeyDown
    document.addEventListener 'keyup', @_onKeyUp

    # Gamepad
    @gamepadsButtons = []
    @gamepadsAxes = []
    for i in [0...4]
      @gamepadsButtons[i] = []
      @gamepadsAxes[i] = []

    window.addEventListener 'blur', @_onBlur
    @reset()

  destroy: ->
    @canvas.removeEventListener 'mousemove', @_onMouseMove
    @canvas.removeEventListener 'mousedown', @_onMouseDown
    document.removeEventListener 'mouseup', @_onMouseUp
    @canvas.removeEventListener "contextmenu", @_onContextMenu
    @canvas.removeEventListener 'DOMMouseScroll', @_onMouseWheel
    @canvas.removeEventListener 'mousewheel', @_onMouseWheel

    @canvas.removeEventListener 'touchstart', @_onTouchStart
    @canvas.removeEventListener 'touchend', @_onTouchEnd
    @canvas.removeEventListener 'touchmove', @_onTouchMove

    @canvas.removeEventListener 'keydown', @_onKeyDown
    document.removeEventListener 'keyup', @_onKeyUp

    window.removeEventListener 'blur'
    return

  reset: ->
    # Mouse
    @newScrollDelta = 0
    for i in [0..6]
      @mouseButtons[i] = { isDown: false, wasJustPressed: false, wasJustReleased: false }
      @mouseButtonsDown[i] = false

    @mousePosition.x = 0
    @mousePosition.y = 0
    @newMousePosition = null

    @mouseDelta.x = 0
    @mouseDelta.y = 0

    # Touch
    for i in [0...@constructor.maxTouches]
      @touches[i] = { isDown: false, wasStarted: false, wasEnded: false, position: { x: 0, y: 0} }
      @touchesDown[i] = false

    # Keyboard
    for i in [0..255]
      @keyboardButtons[i] = { isDown: false, wasJustPressed: false, wasJustReleased: false }
      @keyboardButtonsDown[i] = false

    # Gamepads
    for i in [0...4]
      for button in [0...16]
        @gamepadsButtons[i][button] = { isDown: false, wasJustPressed: false, wasJustReleased: false }

      for axes in [0...4]
        @gamepadsAxes[i][axes] = 0
    return

  _onBlur: => @reset()

  _onMouseMove: (event) =>
    event.preventDefault()

    rect = event.target.getBoundingClientRect()
    @newMousePosition = x: event.clientX - rect.left, y: event.clientY - rect.top
    return

  _onMouseDown: (event) =>
    event.preventDefault()
    @canvas.focus()
    @mouseButtonsDown[event.button] = true
    return

  _onMouseUp: (event) =>
    event.preventDefault() if @mouseButtonsDown[event.button]
    @mouseButtonsDown[event.button] = false
    return

  _onContextMenu: (event) =>
    event.preventDefault()
    return

  _onMouseWheel: (event) =>
    event.preventDefault()
    @newScrollDelta = if (event.wheelDelta > 0 || event.detail < 0) then 1 else -1
    false

  _onTouchStart: (event) =>
    event.preventDefault()

    rect = event.target.getBoundingClientRect()

    for touch in event.changedTouches
      @touches[touch.identifier].position.x = touch.clientX - rect.left
      @touches[touch.identifier].position.y = touch.clientY - rect.top

      @touchesDown[touch.identifier] = true

      if touch.identifier == 0
        @newMousePosition = x: touch.clientX - rect.left, y: touch.clientY - rect.top
        @mouseButtonsDown[0] = true
    return

  _onTouchEnd: (event) =>
    event.preventDefault()

    for touch in event.changedTouches
      @touchesDown[touch.identifier] = false

      @mouseButtonsDown[0] = false if touch.identifier == 0
    return

  _onTouchMove: (event) =>
    event.preventDefault()

    rect = event.target.getBoundingClientRect()

    for touch in event.changedTouches
      @touches[touch.identifier].position.x = touch.clientX - rect.left
      @touches[touch.identifier].position.y = touch.clientY - rect.top

      if touch.identifier == 0
        @newMousePosition = x: touch.clientX - rect.left, y: touch.clientY - rect.top
    return

  # TODO: stop using keyCode when KeyboardEvent.code is supported more widely
  # See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.code

  _onKeyDown: (event) =>
    event.preventDefault() if event.keyCode not in [ window.KeyEvent.DOM_VK_F12, window.KeyEvent.DOM_VK_F5 ]
    @keyboardButtonsDown[event.keyCode] = true
    return

  _onKeyUp: (event) =>
    @keyboardButtonsDown[event.keyCode] = false
    return

  update: ->
    @mouseButtonsDown[5] = @newScrollDelta > 0
    @mouseButtonsDown[6] = @newScrollDelta < 0
    @newScrollDelta = 0 if @newScrollDelta != 0

    if @newMousePosition?
      @mouseDelta.x = @newMousePosition.x - @mousePosition.x
      @mouseDelta.y = @newMousePosition.y - @mousePosition.y

      @mousePosition.x = @newMousePosition.x
      @mousePosition.y = @newMousePosition.y
      @newMousePosition = null
    else
      @mouseDelta.x = 0
      @mouseDelta.y = 0

    for mouseButton, mouseButtonIndex in @mouseButtons
      wasDown = mouseButton.isDown
      mouseButton.isDown = @mouseButtonsDown[mouseButtonIndex]

      mouseButton.wasJustPressed = not wasDown and mouseButton.isDown
      mouseButton.wasJustReleased = wasDown and not mouseButton.isDown

    for touch, touchIndex in @touches
      wasDown = touch.isDown
      touch.isDown = @touchesDown[touchIndex]

      touch.wasStarted = not wasDown and touch.isDown
      touch.wasReleased = wasDown and not touch.isDown

    for keyboardButton, keyboardButtonIndex in @keyboardButtons
      wasDown = keyboardButton.isDown
      keyboardButton.isDown = @keyboardButtonsDown[keyboardButtonIndex]

      keyboardButton.wasJustPressed = not wasDown and keyboardButton.isDown
      keyboardButton.wasJustReleased = wasDown and not keyboardButton.isDown

    for index in [0...4]
      gamepad = navigator.getGamepads?()[index]

      for button, buttonIndex in @gamepadsButtons[index]
        wasDown = button.isDown
        button.isDown = gamepad?.buttons[buttonIndex]?.pressed ? false

        button.wasJustPressed = not wasDown and button.isDown
        button.wasJustReleased = wasDown and not button.isDown

      if gamepad?
        for stick in [0, 2]
          axisLength = Math.sqrt( Math.pow(Math.abs(gamepad.axes[stick]), 2) + Math.pow(Math.abs(gamepad.axes[stick+1]), 2) )
          if axisLength < 0.25
            @gamepadsAxes[index][stick] = 0
            @gamepadsAxes[index][stick+1] = 0
          else
            @gamepadsAxes[index][stick] = gamepad.axes[stick]
            @gamepadsAxes[index][stick+1] = gamepad.axes[stick+1]

    return

if ! KeyEvent? and window?
  window.KeyEvent =
    DOM_VK_CANCEL: 3
    DOM_VK_HELP: 6
    DOM_VK_BACK_SPACE: 8
    DOM_VK_TAB: 9
    DOM_VK_CLEAR: 12
    DOM_VK_RETURN: 13
    DOM_VK_ENTER: 14
    DOM_VK_SHIFT: 16
    DOM_VK_CONTROL: 17
    DOM_VK_ALT: 18
    DOM_VK_PAUSE: 19
    DOM_VK_CAPS_LOCK: 20
    DOM_VK_ESCAPE: 27
    DOM_VK_SPACE: 32
    DOM_VK_PAGE_UP: 33
    DOM_VK_PAGE_DOWN: 34
    DOM_VK_END: 35
    DOM_VK_HOME: 36
    DOM_VK_LEFT: 37
    DOM_VK_UP: 38
    DOM_VK_RIGHT: 39
    DOM_VK_DOWN: 40
    DOM_VK_PRINTSCREEN: 44
    DOM_VK_INSERT: 45
    DOM_VK_DELETE: 46
    DOM_VK_0: 48
    DOM_VK_1: 49
    DOM_VK_2: 50
    DOM_VK_3: 51
    DOM_VK_4: 52
    DOM_VK_5: 53
    DOM_VK_6: 54
    DOM_VK_7: 55
    DOM_VK_8: 56
    DOM_VK_9: 57
    DOM_VK_SEMICOLON: 59
    DOM_VK_EQUALS: 61
    DOM_VK_A: 65
    DOM_VK_B: 66
    DOM_VK_C: 67
    DOM_VK_D: 68
    DOM_VK_E: 69
    DOM_VK_F: 70
    DOM_VK_G: 71
    DOM_VK_H: 72
    DOM_VK_I: 73
    DOM_VK_J: 74
    DOM_VK_K: 75
    DOM_VK_L: 76
    DOM_VK_M: 77
    DOM_VK_N: 78
    DOM_VK_O: 79
    DOM_VK_P: 80
    DOM_VK_Q: 81
    DOM_VK_R: 82
    DOM_VK_S: 83
    DOM_VK_T: 84
    DOM_VK_U: 85
    DOM_VK_V: 86
    DOM_VK_W: 87
    DOM_VK_X: 88
    DOM_VK_Y: 89
    DOM_VK_Z: 90
    DOM_VK_CONTEXT_MENU: 93
    DOM_VK_NUMPAD0: 96
    DOM_VK_NUMPAD1: 97
    DOM_VK_NUMPAD2: 98
    DOM_VK_NUMPAD3: 99
    DOM_VK_NUMPAD4: 100
    DOM_VK_NUMPAD5: 101
    DOM_VK_NUMPAD6: 102
    DOM_VK_NUMPAD7: 103
    DOM_VK_NUMPAD8: 104
    DOM_VK_NUMPAD9: 105
    DOM_VK_MULTIPLY: 106
    DOM_VK_ADD: 107
    DOM_VK_SEPARATOR: 108
    DOM_VK_SUBTRACT: 109
    DOM_VK_DECIMAL: 110
    DOM_VK_DIVIDE: 111
    DOM_VK_F1: 112
    DOM_VK_F2: 113
    DOM_VK_F3: 114
    DOM_VK_F4: 115
    DOM_VK_F5: 116
    DOM_VK_F6: 117
    DOM_VK_F7: 118
    DOM_VK_F8: 119
    DOM_VK_F9: 120
    DOM_VK_F10: 121
    DOM_VK_F11: 122
    DOM_VK_F12: 123
    DOM_VK_F13: 124
    DOM_VK_F14: 125
    DOM_VK_F15: 126
    DOM_VK_F16: 127
    DOM_VK_F17: 128
    DOM_VK_F18: 129
    DOM_VK_F19: 130
    DOM_VK_F20: 131
    DOM_VK_F21: 132
    DOM_VK_F22: 133
    DOM_VK_F23: 134
    DOM_VK_F24: 135
    DOM_VK_NUM_LOCK: 144
    DOM_VK_SCROLL_LOCK: 145
    DOM_VK_COMMA: 188
    DOM_VK_PERIOD: 190
    DOM_VK_SLASH: 191
    DOM_VK_BACK_QUOTE: 192
    DOM_VK_OPEN_BRACKET: 219
    DOM_VK_BACK_SLASH: 220
    DOM_VK_CLOSE_BRACKET: 221
    DOM_VK_QUOTE: 222
    DOM_VK_META: 224
