class Input {
  static maxTouches = 10;

  canvas: HTMLCanvasElement;

  mouseButtons: Array<{isDown: boolean; wasJustPressed: boolean; wasJustReleased: boolean;}> = [];
  mouseButtonsDown: boolean[] = [];
  mousePosition = { x: 0, y: 0 };
  newMousePosition: {x: number; y: number;};
  mouseDelta    = { x: 0, y: 0 };
  newScrollDelta: number;

  touches: Array<{isDown: boolean; wasStarted: boolean; wasEnded: boolean; position: {x: number; y: number;}}> = [];
  touchesDown: boolean[] = [];

  keyboardButtons: Array<{isDown: boolean; wasJustPressed: boolean; wasJustReleased: boolean;}> = [];
  keyboardButtonsDown: boolean[] = [];

  gamepadsButtons: Array<Array<{isDown: boolean; wasJustPressed: boolean; wasJustReleased: boolean;}>> = [];
  gamepadsAxes: Array<number[]> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Mouse
    this.canvas.addEventListener("mousemove", this._onMouseMove);
    this.canvas.addEventListener("mousedown", this._onMouseDown);
    document.addEventListener("mouseup", this._onMouseUp);
    this.canvas.addEventListener("contextmenu", this._onContextMenu);
    this.canvas.addEventListener("DOMMouseScroll", this._onMouseWheel);
    this.canvas.addEventListener("mousewheel", this._onMouseWheel);

    // Touch
    this.canvas.addEventListener("touchstart", this._onTouchStart);
    this.canvas.addEventListener("touchend", this._onTouchEnd);
    this.canvas.addEventListener("touchmove", this._onTouchMove);

    // Keyboard
    this.canvas.addEventListener("keydown", this._onKeyDown);
    document.addEventListener("keyup", this._onKeyUp);

    // Gamepad
    for (var i = 0; i < 4; i++) {
      this.gamepadsButtons[i] = [];
      this.gamepadsAxes[i] = [];
      }

    window.addEventListener("blur", this._onBlur);
    this.reset()
  }

  destroy() {
    this.canvas.removeEventListener("mousemove", this._onMouseMove);
    this.canvas.removeEventListener("mousedown", this._onMouseDown);
    document.removeEventListener("mouseup", this._onMouseUp);
    this.canvas.removeEventListener("contextmenu", this._onContextMenu);
    this.canvas.removeEventListener("DOMMouseScroll", this._onMouseWheel);
    this.canvas.removeEventListener("mousewheel", this._onMouseWheel);

    this.canvas.removeEventListener("touchstart", this._onTouchStart);
    this.canvas.removeEventListener("touchend", this._onTouchEnd);
    this.canvas.removeEventListener("touchmove", this._onTouchMove);

    this.canvas.removeEventListener("keydown", this._onKeyDown);
    document.removeEventListener("keyup", this._onKeyUp);

    window.removeEventListener("blur", this._onBlur);
  }

  reset() {
    // Mouse
    this.newScrollDelta = 0;
    for (var i = 0; i <= 6; i++) {
      this.mouseButtons[i] = { isDown: false, wasJustPressed: false, wasJustReleased: false };
      this.mouseButtonsDown[i] = false;
    }

    this.mousePosition.x = 0;
    this.mousePosition.y = 0;
    this.newMousePosition = null;

    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;

    // Touch
    for (var i = 0; i < Input.maxTouches; i++) {
      this.touches[i] = { isDown: false, wasStarted: false, wasEnded: false, position: { x: 0, y: 0} };
      this.touchesDown[i] = false;
    }

    // Keyboard
    for (var i = 0; i <= 255; i++) {
      this.keyboardButtons[i] = { isDown: false, wasJustPressed: false, wasJustReleased: false };
      this.keyboardButtonsDown[i] = false;
    }

    // Gamepads
    for (var i = 0; i < 4; i++) {
      for (var button = 0; button < 16; button++) this.gamepadsButtons[i][button] = { isDown: false, wasJustPressed: false, wasJustReleased: false };
      for (var axes = 0; axes < 4; axes++) this.gamepadsAxes[i][axes] = 0;
    }
  }

  _onBlur = () => { this.reset(); }

  _onMouseMove = (event: any) => {
    event.preventDefault();

    var rect = event.target.getBoundingClientRect()
    this.newMousePosition = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  _onMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    this.canvas.focus();
    this.mouseButtonsDown[event.button] = true;
  }

  _onMouseUp = (event: MouseEvent) => {
    if (this.mouseButtonsDown[event.button]) event.preventDefault();
    this.mouseButtonsDown[event.button] = false;
  }

  _onContextMenu = (event: Event) => {
    event.preventDefault();
  }

  _onMouseWheel = (event: MouseWheelEvent) => {
    event.preventDefault();
    this.newScrollDelta = (event.wheelDelta > 0 || event.detail < 0) ? 1 : -1;
    return false;
  }

  _onTouchStart = (event: any) => {
    event.preventDefault();

    var rect = event.target.getBoundingClientRect();
    event.changedTouches.forEach((touch: any) => {
      this.touches[touch.identifier].position.x = touch.clientX - rect.left;
      this.touches[touch.identifier].position.y = touch.clientY - rect.top;

      this.touchesDown[touch.identifier] = true;

      if (touch.identifier == 0) {
        this.newMousePosition = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        this.mouseButtonsDown[0] = true;
      }
    });
  }

  _onTouchEnd = (event: any) => {
    event.preventDefault();

    event.changedTouches.forEach((touch: any) => {
      this.touchesDown[touch.identifier] = false;
      if (touch.identifier == 0) this.mouseButtonsDown[0] = false;
    });
  }

  _onTouchMove = (event: any) => {
    event.preventDefault();

    var rect = event.target.getBoundingClientRect();

    event.changedTouches.forEach((touch: any) => {
      this.touches[touch.identifier].position.x = touch.clientX - rect.left;
      this.touches[touch.identifier].position.y = touch.clientY - rect.top;

      if (touch.identifier == 0) this.newMousePosition = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    });
  }

  // TODO: stop using keyCode when KeyboardEvent.code is supported more widely
  // See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.code

  _onKeyDown = (event: KeyboardEvent) => {
    if (event.keyCode !== (<any>window)["KeyEvent"].DOM_VK_F12 && event.keyCode !== (<any>window)["KeyEvent"].DOM_VK_F5) event.preventDefault();
    this.keyboardButtonsDown[event.keyCode] = true;
  }

  _onKeyUp = (event: KeyboardEvent) => {
    this.keyboardButtonsDown[event.keyCode] = false;
  }

  update() {
    this.mouseButtonsDown[5] = this.newScrollDelta > 0;
    this.mouseButtonsDown[6] = this.newScrollDelta < 0;
    if (this.newScrollDelta != 0) this.newScrollDelta = 0;

    if (this.newMousePosition != null) {
      this.mouseDelta.x = this.newMousePosition.x - this.mousePosition.x;
      this.mouseDelta.y = this.newMousePosition.y - this.mousePosition.y;

      this.mousePosition.x = this.newMousePosition.x;
      this.mousePosition.y = this.newMousePosition.y;
      this.newMousePosition = null;
    }
    else {
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }

    this.mouseButtons.forEach((mouseButton, mouseButtonIndex) => {
      var wasDown = mouseButton.isDown;
      mouseButton.isDown = this.mouseButtonsDown[mouseButtonIndex];

      mouseButton.wasJustPressed = ! wasDown && mouseButton.isDown;
      mouseButton.wasJustReleased = wasDown && ! mouseButton.isDown;
    });

    this.touches.forEach((touch, touchIndex) => {
      var wasDown = touch.isDown;
      touch.isDown = this.touchesDown[touchIndex];

      touch.wasStarted = ! wasDown && touch.isDown;
      touch.wasEnded = wasDown && ! touch.isDown;
    });

    this.keyboardButtons.forEach((keyboardButton, keyboardButtonIndex) => {
      var wasDown = keyboardButton.isDown;
      keyboardButton.isDown = this.keyboardButtonsDown[keyboardButtonIndex];

      keyboardButton.wasJustPressed = ! wasDown && keyboardButton.isDown;
      keyboardButton.wasJustReleased = wasDown && ! keyboardButton.isDown;
    })

    var nav: any = navigator;
    var gamepads = nav.getGamepads();
    if (gamepads == null) return;

    for (var index = 0; index < 4; index++) {
      var gamepad = gamepads[index];
      if (gamepad == null) continue;

      this.gamepadsButtons[index].forEach((button, buttonIndex) => {
        var wasDown = button.isDown;
        button.isDown = gamepad.buttons[buttonIndex].pressed;

        button.wasJustPressed = ! wasDown && button.isDown;
        button.wasJustReleased = wasDown && ! button.isDown;
      });

      for (var stick = 0; stick < 2; stick++) {
        var axisLength = Math.sqrt( Math.pow(Math.abs(gamepad.axes[2*stick]), 2) + Math.pow(Math.abs(gamepad.axes[2*stick+1]), 2) );
        if (axisLength < 0.25) {
          this.gamepadsAxes[index][2*stick] = 0;
          this.gamepadsAxes[index][2*stick+1] = 0;
        }
        else {
          this.gamepadsAxes[index][2*stick] = gamepad.axes[2*stick];
          this.gamepadsAxes[index][2*stick+1] = gamepad.axes[2*stick+1];
        }
      }
    }
  }
}

export = Input;

// FIXME: KeyEvent isn't in lib.d.ts yet
if (global.window != null && (<any>window)["KeyEvent"] == null) {
  (<any>window)["KeyEvent"] = {
    DOM_VK_CANCEL: 3,
    DOM_VK_HELP: 6,
    DOM_VK_BACK_SPACE: 8,
    DOM_VK_TAB: 9,
    DOM_VK_CLEAR: 12,
    DOM_VK_RETURN: 13,
    DOM_VK_ENTER: 14,
    DOM_VK_SHIFT: 16,
    DOM_VK_CONTROL: 17,
    DOM_VK_ALT: 18,
    DOM_VK_PAUSE: 19,
    DOM_VK_CAPS_LOCK: 20,
    DOM_VK_ESCAPE: 27,
    DOM_VK_SPACE: 32,
    DOM_VK_PAGE_UP: 33,
    DOM_VK_PAGE_DOWN: 34,
    DOM_VK_END: 35,
    DOM_VK_HOME: 36,
    DOM_VK_LEFT: 37,
    DOM_VK_UP: 38,
    DOM_VK_RIGHT: 39,
    DOM_VK_DOWN: 40,
    DOM_VK_PRINTSCREEN: 44,
    DOM_VK_INSERT: 45,
    DOM_VK_DELETE: 46,
    DOM_VK_0: 48,
    DOM_VK_1: 49,
    DOM_VK_2: 50,
    DOM_VK_3: 51,
    DOM_VK_4: 52,
    DOM_VK_5: 53,
    DOM_VK_6: 54,
    DOM_VK_7: 55,
    DOM_VK_8: 56,
    DOM_VK_9: 57,
    DOM_VK_SEMICOLON: 59,
    DOM_VK_EQUALS: 61,
    DOM_VK_A: 65,
    DOM_VK_B: 66,
    DOM_VK_C: 67,
    DOM_VK_D: 68,
    DOM_VK_E: 69,
    DOM_VK_F: 70,
    DOM_VK_G: 71,
    DOM_VK_H: 72,
    DOM_VK_I: 73,
    DOM_VK_J: 74,
    DOM_VK_K: 75,
    DOM_VK_L: 76,
    DOM_VK_M: 77,
    DOM_VK_N: 78,
    DOM_VK_O: 79,
    DOM_VK_P: 80,
    DOM_VK_Q: 81,
    DOM_VK_R: 82,
    DOM_VK_S: 83,
    DOM_VK_T: 84,
    DOM_VK_U: 85,
    DOM_VK_V: 86,
    DOM_VK_W: 87,
    DOM_VK_X: 88,
    DOM_VK_Y: 89,
    DOM_VK_Z: 90,
    DOM_VK_CONTEXT_MENU: 93,
    DOM_VK_NUMPAD0: 96,
    DOM_VK_NUMPAD1: 97,
    DOM_VK_NUMPAD2: 98,
    DOM_VK_NUMPAD3: 99,
    DOM_VK_NUMPAD4: 100,
    DOM_VK_NUMPAD5: 101,
    DOM_VK_NUMPAD6: 102,
    DOM_VK_NUMPAD7: 103,
    DOM_VK_NUMPAD8: 104,
    DOM_VK_NUMPAD9: 105,
    DOM_VK_MULTIPLY: 106,
    DOM_VK_ADD: 107,
    DOM_VK_SEPARATOR: 108,
    DOM_VK_SUBTRACT: 109,
    DOM_VK_DECIMAL: 110,
    DOM_VK_DIVIDE: 111,
    DOM_VK_F1: 112,
    DOM_VK_F2: 113,
    DOM_VK_F3: 114,
    DOM_VK_F4: 115,
    DOM_VK_F5: 116,
    DOM_VK_F6: 117,
    DOM_VK_F7: 118,
    DOM_VK_F8: 119,
    DOM_VK_F9: 120,
    DOM_VK_F10: 121,
    DOM_VK_F11: 122,
    DOM_VK_F12: 123,
    DOM_VK_F13: 124,
    DOM_VK_F14: 125,
    DOM_VK_F15: 126,
    DOM_VK_F16: 127,
    DOM_VK_F17: 128,
    DOM_VK_F18: 129,
    DOM_VK_F19: 130,
    DOM_VK_F20: 131,
    DOM_VK_F21: 132,
    DOM_VK_F22: 133,
    DOM_VK_F23: 134,
    DOM_VK_F24: 135,
    DOM_VK_NUM_LOCK: 144,
    DOM_VK_SCROLL_LOCK: 145,
    DOM_VK_COMMA: 188,
    DOM_VK_PERIOD: 190,
    DOM_VK_SLASH: 191,
    DOM_VK_BACK_QUOTE: 192,
    DOM_VK_OPEN_BRACKET: 219,
    DOM_VK_BACK_SLASH: 220,
    DOM_VK_CLOSE_BRACKET: 221,
    DOM_VK_QUOTE: 222,
    DOM_VK_META: 224
  }
}
