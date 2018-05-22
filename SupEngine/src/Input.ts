import { EventEmitter } from "events";

interface KeyState {
  isDown: boolean;
  wasJustPressed: boolean;
  wasJustAutoRepeated: boolean;
  wasJustReleased: boolean;
}

interface MouseButtonState {
  isDown: boolean;
  doubleClicked: boolean;
  wasJustPressed: boolean;
  wasJustReleased: boolean;
}

interface TouchState {
  isDown: boolean;
  wasStarted: boolean;
  wasEnded: boolean;
  position: { x: number; y: number; };
}

interface GamepadButtonState {
  isDown: boolean;
  wasJustPressed: boolean;
  wasJustReleased: boolean;
  value: number;
}

interface GamepadAxisState {
  wasPositiveJustPressed: boolean;
  wasPositiveJustAutoRepeated: boolean;
  wasPositiveJustReleased: boolean;
  wasNegativeJustPressed: boolean;
  wasNegativeJustAutoRepeated: boolean;
  wasNegativeJustReleased: boolean;
  value: number;
}

interface GamepadAutoRepeat {
  axis: number;
  positive: boolean;
  time: number;
}

export default class Input extends EventEmitter {
  static maxTouches = 10;

  canvas: HTMLCanvasElement;

  mouseButtons: MouseButtonState[] = [];
  mouseButtonsDown: boolean[] = [];
  mousePosition = { x: 0, y: 0 };
  newMousePosition: { x: number; y: number; };
  mouseDelta = { x: 0, y: 0 };
  newMouseDelta = { x: 0, y: 0 };
  newScrollDelta: number;

  touches: TouchState[] = [];
  touchesDown: boolean[] = [];

  keyboardButtons: KeyState[] = [];
  keyboardButtonsDown: boolean[] = [];
  autoRepeatedKey: number = null;
  textEntered = "";
  newTextEntered = "";

  gamepadsButtons: GamepadButtonState[][] = [];
  gamepadsAxes: GamepadAxisState[][] = [];
  gamepadsAutoRepeats: GamepadAutoRepeat[] = [];
  gamepadAxisDeadZone = 0.25;
  gamepadAxisAutoRepeatDelayMs = 500;
  gamepadAxisAutoRepeatRateMs = 33;

  exited = false;

  private wantsPointerLock = false;
  private wantsFullscreen = false;
  private wasPointerLocked = false;
  private wasFullscreen = false;

  constructor(canvas: HTMLCanvasElement, options: { enableOnExit?: boolean } = {}) {
    super();

    if (options == null) options = {};

    this.canvas = canvas;

    // Mouse
    this.canvas.addEventListener("mousemove", this.onMouseMove);
    this.canvas.addEventListener("mousedown", this.onMouseDown);
    this.canvas.addEventListener("dblclick", this.onMouseDblClick);
    document.addEventListener("mouseup", this.onMouseUp);
    this.canvas.addEventListener("contextmenu", this.onContextMenu);
    this.canvas.addEventListener("DOMMouseScroll", this.onMouseWheel);
    this.canvas.addEventListener("mousewheel", this.onMouseWheel);

    if ("onpointerlockchange" in document) document.addEventListener("pointerlockchange", this.onPointerLockChange, false);
    else if ("onmozpointerlockchange" in document) (document as any).addEventListener("mozpointerlockchange", this.onPointerLockChange, false);
    else if ("onwebkitpointerlockchange" in document) (document as any).addEventListener("webkitpointerlockchange", this.onPointerLockChange, false);

    if ("onpointerlockerror" in document) document.addEventListener("pointerlockerror", this.onPointerLockError, false);
    else if ("onmozpointerlockerror" in document) (document as any).addEventListener("mozpointerlockerror", this.onPointerLockError, false);
    else if ("onwebkitpointerlockerror" in document) (document as any).addEventListener("webkitpointerlockerror", this.onPointerLockError, false);

    if ("onfullscreenchange" in document) document.addEventListener("fullscreenchange", this.onFullscreenChange, false);
    else if ("onmozfullscreenchange" in document) (document as any).addEventListener("mozfullscreenchange", this.onFullscreenChange, false);
    else if ("onwebkitfullscreenchange" in document) (document as any).addEventListener("webkitfullscreenchange", this.onFullscreenChange, false);

    if ("onfullscreenerror" in document) document.addEventListener("fullscreenerror", this.onFullscreenError, false);
    else if ("onmozfullscreenerror" in document) (document as any).addEventListener("mozfullscreenerror", this.onFullscreenError, false);
    else if ("onwebkitfullscreenerror" in document) (document as any).addEventListener("webkitfullscreenerror", this.onFullscreenError, false);

    // Touch
    this.canvas.addEventListener("touchstart", this.onTouchStart);
    this.canvas.addEventListener("touchend", this.onTouchEnd);
    this.canvas.addEventListener("touchmove", this.onTouchMove);

    // Keyboard
    this.canvas.addEventListener("keydown", this.onKeyDown);
    this.canvas.addEventListener("keypress", this.onKeyPress);
    document.addEventListener("keyup", this.onKeyUp);

    // Gamepad
    for (let i = 0; i < 4; i++) {
      this.gamepadsButtons[i] = [];
      this.gamepadsAxes[i] = [];
      this.gamepadsAutoRepeats[i] = null;
    }

    // On exit
    if (options.enableOnExit) {
      window.onbeforeunload = this.doExitCallback;
    }

    window.addEventListener("blur", this.onBlur);
    this.reset();
  }

  destroy() {
    this.removeAllListeners();

    this.canvas.removeEventListener("mousemove", this.onMouseMove);
    this.canvas.removeEventListener("mousedown", this.onMouseDown);
    document.removeEventListener("mouseup", this.onMouseUp);
    this.canvas.removeEventListener("contextmenu", this.onContextMenu);
    this.canvas.removeEventListener("DOMMouseScroll", this.onMouseWheel);
    this.canvas.removeEventListener("mousewheel", this.onMouseWheel);

    if ("onpointerlockchange" in document) document.removeEventListener("pointerlockchange", this.onPointerLockChange, false);
    else if ("onmozpointerlockchange" in document) (document as any).removeEventListener("mozpointerlockchange", this.onPointerLockChange, false);
    else if ("onwebkitpointerlockchange" in document) (document as any).removeEventListener("webkitpointerlockchange", this.onPointerLockChange, false);

    if ("onpointerlockerror" in document) document.removeEventListener("pointerlockerror", this.onPointerLockError, false);
    else if ("onmozpointerlockerror" in document) (document as any).removeEventListener("mozpointerlockerror", this.onPointerLockError, false);
    else if ("onwebkitpointerlockerror" in document) (document as any).removeEventListener("webkitpointerlockerror", this.onPointerLockError, false);

    if ("onfullscreenchange" in document) document.removeEventListener("fullscreenchange", this.onFullscreenChange, false);
    else if ("onmozfullscreenchange" in document) (document as any).removeEventListener("mozfullscreenchange", this.onFullscreenChange, false);
    else if ("onwebkitfullscreenchange" in document) (document as any).removeEventListener("webkitfullscreenchange", this.onFullscreenChange, false);

    if ("onfullscreenerror" in document) document.removeEventListener("fullscreenerror", this.onFullscreenError, false);
    else if ("onmozfullscreenerror" in document) (document as any).removeEventListener("mozfullscreenerror", this.onFullscreenError, false);
    else if ("onwebkitfullscreenerror" in document) (document as any).removeEventListener("webkitfullscreenerror", this.onFullscreenError, false);

    this.canvas.removeEventListener("touchstart", this.onTouchStart);
    this.canvas.removeEventListener("touchend", this.onTouchEnd);
    this.canvas.removeEventListener("touchmove", this.onTouchMove);

    this.canvas.removeEventListener("keydown", this.onKeyDown);
    this.canvas.removeEventListener("keypress", this.onKeyPress);
    document.removeEventListener("keyup", this.onKeyUp);

    window.removeEventListener("blur", this.onBlur);
  }

  reset() {
    // Mouse
    this.newScrollDelta = 0;
    for (let i = 0; i <= 6; i++) {
      this.mouseButtons[i] = { isDown: false, doubleClicked: false, wasJustPressed: false, wasJustReleased: false };
      this.mouseButtonsDown[i] = false;
    }

    this.mousePosition.x = 0;
    this.mousePosition.y = 0;
    this.newMousePosition = null;

    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    this.newMouseDelta.x = 0;
    this.newMouseDelta.y = 0;

    // Touch
    for (let i = 0; i < Input.maxTouches; i++) {
      this.touches[i] = { isDown: false, wasStarted: false, wasEnded: false, position: { x: 0, y: 0} };
      this.touchesDown[i] = false;
    }

    // Keyboard
    for (let i = 0; i <= 255; i++) {
      this.keyboardButtons[i] = { isDown: false, wasJustPressed: false, wasJustAutoRepeated: false, wasJustReleased: false };
      this.keyboardButtonsDown[i] = false;
    }

    this.textEntered = "";
    this.newTextEntered = "";

    // Gamepads
    for (let i = 0; i < 4; i++) {
      for (let button = 0; button < 16; button++) {
        this.gamepadsButtons[i][button] = {
          isDown: false,
          wasJustPressed: false,
          wasJustReleased: false,
          value: 0
        };
      }
      for (let axes = 0; axes < 4; axes++) {
        this.gamepadsAxes[i][axes] = {
          wasPositiveJustPressed: false,
          wasPositiveJustAutoRepeated: false,
          wasPositiveJustReleased: false,
          wasNegativeJustPressed: false,
          wasNegativeJustAutoRepeated: false,
          wasNegativeJustReleased: false,
          value: 0
        };
      }
    }
  }


  lockMouse() {
    this.wantsPointerLock = true;
    this.newMouseDelta.x = 0;
    this.newMouseDelta.y = 0;
  }

  unlockMouse() {
    this.wantsPointerLock = false;
    this.wasPointerLocked = false;
    if (!this._isPointerLocked()) return;

    if ((<any>document).exitPointerLock) (<any>document).exitPointerLock();
    else if ((<any>document).webkitExitPointerLock) (<any>document).webkitExitPointerLock();
    else if ((<any>document).mozExitPointerLock) (<any>document).mozExitPointerLock();
  }

  _isPointerLocked() {
    return (<any>document).pointerLockElement === this.canvas ||
      (<any>document).webkitPointerLockElement === this.canvas ||
      (<any>document).mozPointerLockElement === this.canvas;
  }

  _doPointerLock() {
    if ((<any>this.canvas).requestPointerLock) (<any>this.canvas).requestPointerLock();
    else if ((<any>this.canvas).webkitRequestPointerLock) (<any>this.canvas).webkitRequestPointerLock();
    else if ((<any>this.canvas).mozRequestPointerLock) (<any>this.canvas).mozRequestPointerLock();
  }

  private onPointerLockChange = () => {
    const isPointerLocked = this._isPointerLocked();
    if (this.wasPointerLocked !== isPointerLocked) {
      this.emit("mouseLockStateChange", isPointerLocked ? "active" : "suspended");
      this.wasPointerLocked = isPointerLocked;
    }
  };

  private onPointerLockError = () => {
    if (this.wasPointerLocked) {
      this.emit("mouseLockStateChange", "suspended");
      this.wasPointerLocked = false;
    }
  };


  goFullscreen() { this.wantsFullscreen = true; }
  exitFullscreen() {
    this.wantsFullscreen = false;
    this.wasFullscreen = false;
    if (!this._isFullscreen()) return;

    if ((document as any).exitFullscreen) (document as any).exitFullscreen();
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
    else if ((document as any).mozCancelFullScreen) (document as any).mozCancelFullScreen();
  }

  _isFullscreen() {
    return (document as any).fullscreenElement === this.canvas ||
      (document as any).webkitFullscreenElement === this.canvas ||
      (document as any).mozFullScreenElement === this.canvas;
  }

  _doGoFullscreen() {
    if ((this.canvas as any).requestFullscreen) (this.canvas as any).requestFullscreen();
    else if ((this.canvas as any).webkitRequestFullscreen) (this.canvas as any).webkitRequestFullscreen();
    else if ((this.canvas as any).mozRequestFullScreen) (this.canvas as any).mozRequestFullScreen();
  }

  private onFullscreenChange = () => {
    const isFullscreen = this._isFullscreen();
    if (this.wasFullscreen !== isFullscreen) {
      this.emit("fullscreenStateChange", isFullscreen ? "active" : "suspended");
      this.wasFullscreen = isFullscreen;
    }
  };

  private onFullscreenError = () => {
    if (this.wasFullscreen) {
      this.emit("fullscreenStateChange", "suspended");
      this.wasFullscreen = false;
    }
  };


  private onBlur = () => { this.reset(); };

  private onMouseMove = (event: any) => {
    event.preventDefault();

    if (this.wantsPointerLock) {
      if (this.wasPointerLocked) {
        const delta = { x: 0, y: 0 };
        if (event.movementX != null) { delta.x = event.movementX; delta.y = event.movementY; }
        else if (event.webkitMovementX != null) { delta.x = event.webkitMovementX; delta.y = event.webkitMovementY; }
        else if (event.mozMovementX == null) { delta.x = event.mozMovementX; delta.y = event.mozMovementY; }

        this.newMouseDelta.x += delta.x;
        this.newMouseDelta.y += delta.y;
      }
    } else {
      const rect = event.target.getBoundingClientRect();
      this.newMousePosition = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    }
  };

  private onMouseDown = (event: MouseEvent) => {
    event.preventDefault();
    this.canvas.focus();
    this.mouseButtonsDown[event.button] = true;

    if (this.wantsFullscreen && !this.wasFullscreen) this._doGoFullscreen();
    if (this.wantsPointerLock && !this.wasPointerLocked) this._doPointerLock();
  };

  private onMouseUp = (event: MouseEvent) => {
    if (this.mouseButtonsDown[event.button]) event.preventDefault();
    this.mouseButtonsDown[event.button] = false;

    if (this.wantsFullscreen && !this.wasFullscreen) this._doGoFullscreen();
    if (this.wantsPointerLock && !this.wasPointerLocked) this._doPointerLock();
  };

  private onMouseDblClick = (event: MouseEvent) => {
    event.preventDefault();
    this.mouseButtons[event.button].doubleClicked = true;
  };

  private onContextMenu = (event: Event) => {
    event.preventDefault();
  };

  private onMouseWheel = (event: MouseWheelEvent) => {
    event.preventDefault();
    this.newScrollDelta = (event.wheelDelta > 0 || event.detail < 0) ? 1 : -1;
    return false;
  };

  private onTouchStart = (event: any) => {
    event.preventDefault();

    const rect = event.target.getBoundingClientRect();
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touches[touch.identifier].position.x = touch.clientX - rect.left;
      this.touches[touch.identifier].position.y = touch.clientY - rect.top;

      this.touchesDown[touch.identifier] = true;

      if (touch.identifier === 0) {
        this.newMousePosition = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        this.mouseButtonsDown[0] = true;
      }
    }
  };

  private onTouchEnd = (event: any) => {
    event.preventDefault();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touchesDown[touch.identifier] = false;
      if (touch.identifier === 0) this.mouseButtonsDown[0] = false;
    }
  };

  private onTouchMove = (event: any) => {
    event.preventDefault();

    const rect = event.target.getBoundingClientRect();

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      this.touches[touch.identifier].position.x = touch.clientX - rect.left;
      this.touches[touch.identifier].position.y = touch.clientY - rect.top;

      if (touch.identifier === 0) this.newMousePosition = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
  };

  // TODO: stop using keyCode when KeyboardEvent.code is supported more widely
  // See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.code
  private onKeyDown = (event: KeyboardEvent) => {
    // NOTE: Key codes in range 33-47 are Page Up/Down, Home/End, arrow keys, Insert/Delete, etc.
    let isControlKey = event.keyCode < 48 && event.keyCode !== 32;
    if (isControlKey) event.preventDefault();

    if (!this.keyboardButtonsDown[event.keyCode]) this.keyboardButtonsDown[event.keyCode] = true;
    else this.autoRepeatedKey = event.keyCode;

    return !isControlKey;
  };

  private onKeyPress = (event: KeyboardEvent) => {
    if (event.keyCode > 0 && event.keyCode < 32) return;

    if (event.char != null) this.newTextEntered += event.char;
    else if (event.charCode !== 0) this.newTextEntered += String.fromCharCode(event.charCode);
    else this.newTextEntered += String.fromCharCode(event.keyCode);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keyboardButtonsDown[event.keyCode] = false;
  };

  private doExitCallback = () => {
    // NOTE: It seems window.onbeforeunload might be called twice
    // in some circumstances so we check if the callback was cleared already
    // http://stackoverflow.com/questions/8711393/onbeforeunload-fires-twice
    if (!this.exited) this.emit("exit");
    this.exited = true;
  };

  update() {
    this.mouseButtonsDown[5] = this.newScrollDelta > 0;
    this.mouseButtonsDown[6] = this.newScrollDelta < 0;
    if (this.newScrollDelta !== 0) this.newScrollDelta = 0;

    if (this.wantsPointerLock) {
      this.mouseDelta.x = this.newMouseDelta.x;
      this.mouseDelta.y = this.newMouseDelta.y;
      this.newMouseDelta.x = 0;
      this.newMouseDelta.y = 0;
    } else if (this.newMousePosition != null) {
      this.mouseDelta.x = this.newMousePosition.x - this.mousePosition.x;
      this.mouseDelta.y = this.newMousePosition.y - this.mousePosition.y;

      this.mousePosition.x = this.newMousePosition.x;
      this.mousePosition.y = this.newMousePosition.y;
      this.newMousePosition = null;
    } else {
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }

    for (let i = 0; i < this.mouseButtons.length; i++) {
      const mouseButton = this.mouseButtons[i];
      const wasDown = mouseButton.isDown;
      mouseButton.isDown = this.mouseButtonsDown[i];

      mouseButton.wasJustPressed = !wasDown && mouseButton.isDown;
      mouseButton.wasJustReleased = wasDown && !mouseButton.isDown;
    }

    for (let i = 0; i < this.touches.length; i++) {
      const touch = this.touches[i];
      const wasDown = touch.isDown;
      touch.isDown = this.touchesDown[i];

      touch.wasStarted = !wasDown && touch.isDown;
      touch.wasEnded = wasDown && !touch.isDown;
    }

    for (let i = 0; i < this.keyboardButtons.length; i++) {
      const keyboardButton = this.keyboardButtons[i];
      const wasDown = keyboardButton.isDown;
      keyboardButton.isDown = this.keyboardButtonsDown[i];

      keyboardButton.wasJustPressed = !wasDown && keyboardButton.isDown;
      keyboardButton.wasJustAutoRepeated = false;
      keyboardButton.wasJustReleased = wasDown && !keyboardButton.isDown;
    }

    if (this.autoRepeatedKey != null) {
      this.keyboardButtons[this.autoRepeatedKey].wasJustAutoRepeated = true;
      this.autoRepeatedKey = null;
    }

    this.textEntered = this.newTextEntered;
    this.newTextEntered = "";

    const gamepads = (navigator.getGamepads != null) ? navigator.getGamepads() : null;
    if (gamepads == null) return;

    for (let index = 0; index < 4; index++) {
      const gamepad = gamepads[index];
      if (gamepad == null) continue;

      for (let i = 0; i < this.gamepadsButtons[index].length; i++) {
        if (gamepad.buttons[i] == null) continue;

        const button = this.gamepadsButtons[index][i];
        const wasDown = button.isDown;
        button.isDown = gamepad.buttons[i].pressed;
        button.value = gamepad.buttons[i].value;

        button.wasJustPressed = !wasDown && button.isDown;
        button.wasJustReleased = wasDown && !button.isDown;
      }

      const pressedValue = 0.5;
      const now = Date.now();

      for (let stick = 0; stick < 2; stick++) {
        if (gamepad.axes[2 * stick] == null || gamepad.axes[2 * stick + 1] == null) continue;
        const axisLength = Math.sqrt( Math.pow(Math.abs(gamepad.axes[2 * stick]), 2) + Math.pow(Math.abs(gamepad.axes[2 * stick + 1]), 2) );

        const axes = [ this.gamepadsAxes[index][2 * stick], this.gamepadsAxes[index][2 * stick + 1] ];

        const wasAxisDown = [
          { positive: axes[0].value > pressedValue, negative: axes[0].value < -pressedValue },
          { positive: axes[1].value > pressedValue, negative: axes[1].value < -pressedValue }
        ];

        if (axisLength < this.gamepadAxisDeadZone) {
          axes[0].value = 0;
          axes[1].value = 0;
        } else {
          axes[0].value = gamepad.axes[2 * stick];
          axes[1].value = gamepad.axes[2 * stick + 1];
        }

        const isAxisDown = [
          { positive: axes[0].value > pressedValue, negative: axes[0].value < -pressedValue },
          { positive: axes[1].value > pressedValue, negative: axes[1].value < -pressedValue }
        ];

        axes[0].wasPositiveJustPressed = !wasAxisDown[0].positive && isAxisDown[0].positive;
        axes[0].wasPositiveJustReleased = wasAxisDown[0].positive && !isAxisDown[0].positive;
        axes[0].wasPositiveJustAutoRepeated = false;

        axes[0].wasNegativeJustPressed = !wasAxisDown[0].negative && isAxisDown[0].negative;
        axes[0].wasNegativeJustReleased = wasAxisDown[0].negative && !isAxisDown[0].negative;
        axes[0].wasNegativeJustAutoRepeated = false;

        axes[1].wasPositiveJustPressed = !wasAxisDown[1].positive && isAxisDown[1].positive;
        axes[1].wasPositiveJustReleased = wasAxisDown[1].positive && !isAxisDown[1].positive;
        axes[1].wasPositiveJustAutoRepeated = false;

        axes[1].wasNegativeJustPressed = !wasAxisDown[1].negative && isAxisDown[1].negative;
        axes[1].wasNegativeJustReleased = wasAxisDown[1].negative && !isAxisDown[1].negative;
        axes[1].wasNegativeJustAutoRepeated = false;

        let currentAutoRepeat = this.gamepadsAutoRepeats[index];
        if (currentAutoRepeat != null) {
          const axisIndex = currentAutoRepeat.axis - stick * 2;
          if (axisIndex === 0 || axisIndex === 1) {
            const autoRepeatedAxis = axes[axisIndex];
            if ((currentAutoRepeat.positive && !isAxisDown[axisIndex].positive) ||
            (!currentAutoRepeat.positive && !isAxisDown[axisIndex].negative)) {
              // Auto-repeated axis has been released
              currentAutoRepeat = this.gamepadsAutoRepeats[index] = null;
            } else {
              // Check for auto-repeat deadline
              if (currentAutoRepeat.time <= now) {
                if (currentAutoRepeat.positive) autoRepeatedAxis.wasPositiveJustAutoRepeated = true;
                else autoRepeatedAxis.wasNegativeJustAutoRepeated = true;
                currentAutoRepeat.time = now + this.gamepadAxisAutoRepeatRateMs;
              }
            }
          }
        }

        let newAutoRepeat: GamepadAutoRepeat;
        if (axes[0].wasPositiveJustPressed || axes[0].wasNegativeJustPressed) {
          newAutoRepeat = { axis: stick * 2, positive: axes[0].wasPositiveJustPressed, time: now + this.gamepadAxisAutoRepeatDelayMs };
        } else if (axes[1].wasPositiveJustPressed || axes[1].wasNegativeJustPressed) {
          newAutoRepeat = { axis: stick * 2 + 1, positive: axes[1].wasPositiveJustPressed, time: now + this.gamepadAxisAutoRepeatDelayMs };
        }

        if (newAutoRepeat != null) {
          if (currentAutoRepeat == null || currentAutoRepeat.axis !== newAutoRepeat.axis || currentAutoRepeat.positive !== newAutoRepeat.positive) {
            this.gamepadsAutoRepeats[index] = newAutoRepeat;
          }
        }
      }
    }
  }
}

// FIXME: KeyEvent isn't in lib.d.ts yet
if ((<any>global).window != null && (<any>window).KeyEvent == null) {
  (<any>window).KeyEvent = {
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
  };
}
