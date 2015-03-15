declare module Sup {
  function log(x: any): any;
  function exit();

  module Math {
    function lerp(a: number, b: number, v: number): number;
    function clamp(v: number, min: number, max: number): number;

    module Random {
      function integer(min: number, max: number): number;
    }

    function toRadians(degrees: number): number;
    function toDegrees(radians: number): number;

    class Vector3 {
      static lerp(a: Vector3, b: Vector3, v: number): Vector3;

      x: number;
      y: number;
      z: number;

      constructor(x?: number, y?: number, z?: number);
      set(x: number, y: number, z: number): Vector3;
      copy(v: Vector3): Vector3;
      add(v: Vector3): Vector3;
      subtract(v: Vector3): Vector3;
      multiplyScalar(m: number): Vector3;
      normalize(): Vector3;
      rotate(q : Quaternion): Vector3;
      length(): number;
      distanceTo(v: Vector3): number;
      clone(): Vector3;
    }

    class Quaternion {
      x: number;
      y: number;
      z: number;
      w: number;

      constructor(x?: number, y?: number, z?: number, w?: number);
      set(x: number, y: number, z: number, w: number);
      setFromAxisAngle(axis: Vector3, angle: number);
      setFromYawPitchRoll(yaw: number, pitch: number, roll: number): Quaternion;
      multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion;
      multiply(q: Quaternion): Quaternion;
      clone(): Quaternion;
    }
  }

  class Asset {
    type: string;
    children: Array<string>;
    constructor(inner: {[key:string]: any;});
  }
  class Folder extends Asset {
    dummyFolderMember;
  }
  function get(path: string, options?: { "ignoreMissing": boolean; }): Asset;
  function get<T extends Asset>(path: string, type: new(inner: {[key:string]: any;}) => T, options?: { "ignoreMissing": boolean; }): T;

  function getActor(name: string): Actor;
  function destroyAllActors(): void;

  class Actor {
    // INSERT_COMPONENT_ACCESSORS
    constructor(name: string, parent?: Actor);
    destroy(): void;

    getName(): string;
    setName(name: string): Actor;
    getVisible(): boolean;
    setVisible(visible: boolean): Actor;
    getParent(): Actor;
    setParent(parent: Actor): Actor;
    getChild(name: string): Actor;
    getChildren(): Array<Actor>;

    getPosition(): Math.Vector3;
    setPosition(position: Math.Vector3): Actor;
    getLocalPosition(): Math.Vector3;
    setLocalPosition(position: Math.Vector3): Actor;
    move(offset: Math.Vector3): Actor;
    moveLocal(offset: Math.Vector3): Actor;
    moveOriented(offset: Math.Vector3): Actor;

    getOrientation(): Math.Quaternion;
    setOrientation(orientation: Math.Quaternion): Actor;
    getLocalOrientation(): Math.Quaternion;
    setLocalOrientation(orientation: Math.Quaternion): Actor;
    rotate(offset: Math.Quaternion): Actor;
    rotateLocal(offset: Math.Quaternion): Actor;

    getEulerAngles(): Math.Vector3;
    setEulerAngles(angles: Math.Vector3): Actor;
    getLocalEulerAngles(): Math.Vector3;
    setLocalEulerAngles(angles: Math.Vector3): Actor;
    rotateEulerAngles(offset: Math.Vector3): Actor;
    rotateLocalEulerAngles(offset: Math.Vector3): Actor;
    lookAt(target: Math.Vector3 ): Actor;
    lookTowards(direction: Math.Vector3): void;

    getLocalScale(): Math.Vector3;
    setLocalScale(scale: Math.Vector3);

    addBehavior<T extends Behavior>(behaviorClass: new(actor: Actor, properties?: { [key: string]: any; }) => T, properties?: { [key: string]: any; }): T;
    getBehavior<T extends Behavior>(type: new(actor: Actor, properties?: { [key: string]: any; }) => T): T;
  }

  class ActorComponent {
    actor: Actor;
    constructor(actor: Actor);
    destroy(): void;
  }

  class Behavior extends ActorComponent {
    constructor(actor: any, properties?: { [key: string]: any; });
  }
  function registerBehavior(behavior: any): void;

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

  module Storage {
    function set(key: string, value: string): void;
    function get(key: string): string;
    function remove(key: string): void;
    function clear(): void;
  }
}
