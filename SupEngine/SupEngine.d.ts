declare const __tmpTHREE: typeof THREE;

declare namespace SupEngine {
  export const THREE: typeof __tmpTHREE;

  export const editorComponentClasses: { [name: string]: any };
  export function registerEditorComponentClass(name: string, component: any): void;

  export const componentClasses: { [name: string]: any };
  export function registerComponentClass(name: string, plugin: any): void;

  export const earlyUpdateFunctions: { [name: string]: (gameInstance: GameInstance) => void };
  export function registerEarlyUpdateFunction(name: string, callback: (gameInstance: GameInstance) => void): void;

  class GameInstance extends EventEmitter {
    framesPerSecond: number;
    ratio: number;
    layers: string[];

    tree: ActorTree;
    cachedActors: Actor[];
    renderComponents: ActorComponent[];
    componentsToBeStarted: ActorComponent[];
    componentsToBeDestroyed: ActorComponent[];
    actorsToBeDestroyed: Actor[];

    input: Input;
    audio: Audio;

    threeRenderer: THREE.WebGLRenderer;
    threeScene: THREE.Scene;

    debug: boolean;
    skipRendering: boolean;

    constructor(canvas: HTMLCanvasElement, options?: { debug?: boolean; enableOnExit?: boolean; layers?: string[]; });
    setRatio(ratio?: number): void;
    tick(accumulatedTime: number, callback?: Function): { updates: number; timeLeft: number; };
    update(): void;
    draw(): void;
    clear(): void;
    destroyComponent(component: ActorComponent): void;
    destroyActor(actor: Actor): void;
    destroyAllActors(): void;
  }

  class ActorTree {
    root: Actor[];

    constructor();
    walkTopDown(callback: (node: Actor, parentNode?: Actor) => boolean): boolean;
    walkDown(rootNode: Actor, callback: (node: Actor, parentNode?: Actor) => boolean): boolean;
  }

  class Actor {
    name: string;
    parent: Actor;
    children: Actor[];
    components: ActorComponent[];
    layer: number;
    pendingForDestruction: boolean;

    gameInstance: GameInstance;
    threeObject: THREE.Object3D;

    constructor(gameInstance: GameInstance, name: string, parent?: Actor, options?: { visible?: boolean; layer?: number; });
    // We have to duplicate the components list because a script could add more
    // components to the actor during the loop and they will be awoken automatically
    awake(): void;
    // Same here, a script component could create additional components and they
    // should only be updated after being started during the next loop
    update(): void;

    // Transform
    getGlobalMatrix(matrix: THREE.Matrix4): THREE.Matrix4;
    getGlobalPosition(position: THREE.Vector3): THREE.Vector3;
    getGlobalOrientation(orientation: THREE.Quaternion): THREE.Quaternion;
    getGlobalEulerAngles(angles: THREE.Euler): THREE.Euler;
    getLocalPosition(position: THREE.Vector3): THREE.Vector3;
    getLocalOrientation(orientation: THREE.Quaternion): THREE.Quaternion;
    getLocalEulerAngles(angles: THREE.Euler): THREE.Euler;
    getLocalScale(scale: THREE.Vector3): THREE.Vector3;
    getParentGlobalOrientation(orientation: THREE.Quaternion): THREE.Quaternion;

    setGlobalMatrix(matrix: THREE.Matrix4): void;
    setGlobalPosition(pos: THREE.Vector3): void;
    setLocalPosition(pos: THREE.Vector3): void;
    lookAt(target: THREE.Vector3, up: THREE.Vector3): void;
    lookTowards(direction: THREE.Vector3, up?: THREE.Vector3): void;

    setLocalOrientation(quaternion: THREE.Quaternion): void;
    setGlobalOrientation(quaternion: THREE.Quaternion): void;
    setLocalEulerAngles(eulerAngles: THREE.Euler): void;
    setGlobalEulerAngles(eulerAngles: THREE.Euler): void;
    setLocalScale(scale: THREE.Vector3): void;
    setParent(newParent: Actor, keepLocal?: boolean): void;

    rotateGlobal(quaternion: THREE.Quaternion): void;
    rotateLocal(quaternion: THREE.Quaternion): void;
    rotateGlobalEulerAngles(eulerAngles: THREE.Euler): void;
    rotateLocalEulerAngles(eulerAngles: THREE.Euler): void;
    moveGlobal(offset: THREE.Vector3): void;
    moveLocal(offset: THREE.Vector3): void;
    moveOriented(offset: THREE.Vector3): void;

    _destroy(): void;
    _markDestructionPending(): void;
  }

  interface ActorComponentUpdater {
    destroy(): void;
  }

  abstract class ActorComponent {
    actor: Actor;
    typeName: string;

    /* tslint:disable-next-line */
    static Updater: new(projectClient: any, component: any, config: any) => ActorComponentUpdater;

    constructor(actor: Actor, typeName: string);
    _destroy(): void;

    awake(): void;
    start(): void;
    update(): void;

    abstract setIsLayerActive(active: boolean): void;
  }

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

  class Input {
    static maxTouches: number;

    exited: boolean;
    canvas: HTMLCanvasElement;

    mouseButtons: MouseButtonState[];
    mouseButtonsDown: boolean[];
    mousePosition: {x: number; y: number; };
    newMousePosition: {x: number; y: number; };
    mouseDelta: {x: number; y: number; };
    newScrollDelta: number;

    touches: TouchState[];
    touchesDown: boolean[];

    keyboardButtons: KeyState[];
    keyboardButtonsDown: boolean[];

    gamepadsButtons: GamepadButtonState[][];
    gamepadsAxes: GamepadAxisState[][];
    gamepadsAutoRepeats: GamepadAutoRepeat[];

    constructor(canvas: HTMLCanvasElement);
    destroy(): void;
    reset(): void;
    update(): void;
  }

  class Audio {
    masterGain: GainNode;

    constructor();
    getContext(): AudioContext;
  }

  class SoundPlayer {
    audioCtx: AudioContext;
    audioMasterGain: GainNode;
    buffer: string|AudioBuffer;
    source: AudioBufferSourceNode;
    gainNode: GainNode;
    panner: PannerNode;

    offset: number;
    startTime: number;
    isLooping: boolean;
    state: SoundPlayer.State;
    volume: number;
    pitch: number;
    pan: number;

    constructor(audioCtx: AudioContext, audioMasterGain: GainNode, buffer: string|AudioBuffer);
    destroy(): void;
    play(): void;
    stop(): void;
    pause(): void;
    getState(): SoundPlayer.State;
    setLoop(isLooping: boolean): void;
    setVolume(volume: number): void;
    setPan(pan: number): void;
    setPitch(pitch: number): void;
  }

  namespace SoundPlayer {
    export enum State { Playing, Paused, Stopped }
  }

  class EventEmitter implements NodeJS.EventEmitter {
    addListener(event: string, listener: Function): this;
    on(event: string, listener: Function): this;
    once(event: string, listener: Function): this;
    removeListener(event: string, listener: Function): this;
    removeAllListeners(event?: string): this;
    setMaxListeners(n: number): this;
    getMaxListeners(): number;
    listeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
    listenerCount(type: string): number;
    prependListener(event: string | symbol, listener: Function): this;
    prependOnceListener(event: string | symbol, listener: Function): this;
    eventNames(): (string | symbol)[];
  }
}
