declare module Sup {
  module Input {
    function getScreenSize(): { x: number; y: number; };
    function getMouseVisible(): boolean;
    function setMouseVisible(visible: boolean);

    function getMousePosition(): { x: number; y: number; };
    function getMouseDelta(): { x: number; y: number; };
    function isMouseButtonDown(button: number): boolean;
    function wasMouseButtonJustPressed(button: number): boolean;
    function wasMouseButtonJustReleased(button: number): boolean;

    function getTouchPosition(index: number): { x: number; y: number; };
    function isTouchDown(index: number): boolean;
    function wasTouchStarted(index: number): boolean;
    function wasTouchEnded(index: number): boolean;
    function vibrate(pattern: number): void;
    function vibrate(pattern: Array<number>): void;

    function isKeyDown(keyName: string): boolean;
    function wasKeyJustPressed(keyName: string): boolean;
    function wasKeyJustReleased(keyName: string): boolean;

    function isGamepadButtonDown(gamepad: number, button: number): boolean;
    function wasGamepadButtonJustPressed(gamepad: number, button: number): boolean;
    function wasGamepadButtonJustReleased(gamepad: number, button: number): boolean;
    function getGamepadAxisValue(gamepad: number, axis: number): number;
  }
}
