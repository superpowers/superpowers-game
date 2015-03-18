module Sup {
  export module Input {

    export function getScreenSize() {
      return { "x": player.canvas.clientWidth, "y": player.canvas.clientHeight };
    }


    export function getMouseVisible() {
      return player.canvas.style.cursor != "none";
    }

    export function setMouseVisible(visible) {
      if (visible) player.canvas.style.cursor = "auto";
      else player.canvas.style.cursor = "none";
    }

    export function getMousePosition() {
      var mousePos = player.gameInstance.input.mousePosition;
      return { x: mousePos.x / player.canvas.clientWidth * 2 - 1, y: (mousePos.y / player.canvas.clientHeight * 2 - 1) * -1 };
    }

    export function isMouseButtonDown(button) {
      if ( player.gameInstance.input.mouseButtons[button] == null ) { throw new Error("Invalid button index") }
      return player.gameInstance.input.mouseButtons[button].isDown
    }

    export function wasMouseButtonJustPressed(button) {
      if ( player.gameInstance.input.mouseButtons[button] == null ) { throw new Error("Invalid button index") }
      return player.gameInstance.input.mouseButtons[button].wasJustPressed
    }

    export function wasMouseButtonJustReleased(button) {
      if ( player.gameInstance.input.mouseButtons[button] == null ) { throw new Error("Invalid button index") }
      return player.gameInstance.input.mouseButtons[button].wasJustReleased
    }


    export function getTouchPosition(index) {
      var position = player.gameInstance.input.touches[index].position;
      return { x: position.x / player.canvas.clientWidth * 2 - 1, y: (position.y / player.canvas.clientHeight * 2 - 1) * -1 };
    }

    export function isTouchDown(index) {
      if ( player.gameInstance.input.touches[index] == null ) { throw new Error("Invalid touch index") }
      return player.gameInstance.input.touches[index].isDown
    }

    export function wasTouchStarted(index) {
      if ( player.gameInstance.input.touches[index] == null ) { throw new Error("Invalid touch index") }
      return player.gameInstance.input.touches[index].wasStarted
    }

    export function wasTouchEnded(index) {
      if ( player.gameInstance.input.touches[index] == null ) { throw new Error("Invalid touch index") }
      return player.gameInstance.input.touches[index].wasReleased
    }


    export function vibrate(pattern) { window.navigator.vibrate(pattern); }

    export function isKeyDown(keyName) {
      if ( player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]] == null ) { throw new Error("Invalid key name") }
      return player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]].isDown
    }

    export function wasKeyJustPressed(keyName) {
      if ( player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]] == null ) { throw new Error("Invalid key name") }
      return player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]].wasJustPressed;
    }

    export function wasKeyJustReleased(keyName) {
      if ( player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]] == null ) { throw new Error("Invalid key name") }
      return player.gameInstance.input.keyboardButtons[window.KeyEvent["DOM_VK_" + keyName ]].wasJustReleased;
    }


    export function isGamepadButtonDown(gamepad, key) {
      if ( player.gameInstance.input.gamepadsButtons[gamepad][key] == null ) { throw new Error("Invalid gamepad info") }
      return player.gameInstance.input.gamepadsButtons[gamepad][key].isDown;
    }

    export function wasGamepadButtonJustPressed(gamepad, key) {
      if ( player.gameInstance.input.gamepadsButtons[gamepad][key] == null ) { throw new Error("Invalid gamepad info") }
      return player.gameInstance.input.gamepadsButtons[gamepad][key].wasJustPressed;
    }

    export function wasGamepadButtonJustReleased(gamepad, key) {
      if ( player.gameInstance.input.gamepadsButtons[gamepad][key] == null ) { throw new Error("Invalid gamepad info") }
      return player.gameInstance.input.gamepadsButtons[gamepad][key].wasJustReleased;
    }

    export function getGamepadAxisValue(gamepad, axis) {
      if ( player.gameInstance.input.gamepadsAxes[gamepad][axis] == null ) { throw new Error("Invalid gamepad info") }
      return player.gameInstance.input.gamepadsAxes[gamepad][axis];
    }

  }
}
