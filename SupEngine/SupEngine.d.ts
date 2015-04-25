///<reference path="../../typings/tsd.d.ts"/>
/// <reference path="./typings/threejs/three.d.ts"/>

declare let __tmpTHREE: typeof THREE;

declare module SupEngine {
  let THREE: typeof __tmpTHREE;

  let editorComponentClasses: {[name: string]: any};
  function registerEditorComponentClass(name: string, component: any): void;

  let componentClasses: {[name: string]: any};
  function registerComponentClass(name: string, plugin: any): void;

  interface ComponentEditorClass {
    new (tbody: HTMLDivElement, config: any, projectClient: any, editConfig: any): {
      destroy(): void;
      config_setProperty(path: string, value: any): void;
    };
  }
  let componentEditorClasses: {[name: string]: ComponentEditorClass};
  function registerComponentEditorClass(name: string, plugin: ComponentEditorClass): void;

  let earlyUpdateFunctions: any;
  function registerEarlyUpdateFunction(name: string, callback: Function): void;

  class GameInstance extends EventEmitter {
    static framesPerSecond: number;

    debug: boolean;
    ratio: number;
    tree: ActorTree;
    cachedActors: Actor[];
    renderComponents: ActorComponent[];
    componentsToBeStarted: ActorComponent[];
    componentsToBeDestroyed: ActorComponent[];
    actorsToBeDestroyed: Actor[];
    skipRendering: boolean;
    exited: boolean;

    input: Input;
    audio: Audio;

    threeRenderer: THREE.WebGLRenderer;
    threeScene: THREE.Scene;

    constructor(canvas: HTMLCanvasElement, options?: {debug?: boolean});
    update(): void;
    setRatio(ratio?: number): void;
    draw(): void;
    clear(): void;
    destroyComponent(component: ActorComponent): void;
    destroyActor(actor: Actor): void;
    destroyAllActors(): void;
  }

  class ActorTree {
    root: Actor[];

    constructor();
    _walkRecurseTopDown(node: Actor, parentNode: Actor, callback: (node: Actor, parentNode?: Actor) => any): void;
    walkTopDown(callback: (node: Actor, parentNode?: Actor) => any): void;
    walkDown(rootNode: Actor, callback: (node: Actor, parentNode?: Actor) => any): void;
  }

  class Actor {
    gameInstance: GameInstance;
    name: string;
    parent: Actor;
    threeObject: THREE.Object3D;

    children: Actor[];
    components: ActorComponent[];
    pendingForDestruction: boolean;

    constructor(gameInstance: GameInstance, name: string, parent?: Actor);
    // We have to duplicate the components list because a script could add more
    // components to the actor during the loop and they will be awoken automatically
    awake(): void;
    // Same here, a script component could create additional components and they
    // should only be updated after being started during the next loop
    update(): void;

    // Transform
    getGlobalMatrix(): THREE.Matrix4;
    getGlobalPosition(): THREE.Vector3;
    getLocalPosition(): THREE.Vector3;
    getGlobalOrientation(): THREE.Quaternion;
    getGlobalEulerAngles(): THREE.Euler;
    getLocalOrientation(): THREE.Quaternion;
    getLocalEulerAngles(): THREE.Euler;
    getLocalScale(): THREE.Vector3;
    getParentGlobalOrientation(): THREE.Quaternion;

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
    setParent(newParent: Actor, keepLocal: boolean): void;

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


  class ActorComponent {
    actor: Actor;
    typeName: string;

    constructor(actor: Actor, typeName: string);
    _destroy(): void;
    awake(): void;
    start(): void;
    update(): void;
  }

  class Input {
    static maxTouches: number;

    canvas: HTMLCanvasElement;

    mouseButtons: Array<{isDown: boolean; wasJustPressed: boolean; wasJustReleased: boolean;}>;
    mouseButtonsDown: boolean[];
    mousePosition: {x: number; y: number;};
    newMousePosition: {x: number; y: number;};
    mouseDelta: {x: number; y: number;};
    newScrollDelta: number;

    touches: Array<{isDown: boolean; wasStarted: boolean; wasEnded: boolean; position: {x: number; y: number;}}>;
    touchesDown: boolean[];

    keyboardButtons: Array<{isDown: boolean; wasJustPressed: boolean; wasJustReleased: boolean;}>;
    keyboardButtonsDown: boolean[];

    gamepadsButtons: Array<any>;
    gamepadsAxes: Array<any>;

    constructor(canvas: HTMLCanvasElement);
    destroy(): void;
    reset(): void;
    update(): void;
  }

  class Audio {
    _ctx: AudioContext;
    masterGain: GainNode;

    constructor();
    getContext(): AudioContext;
  }

  enum SoundStates {playing, paused, stopped}
  class SoundInstance {
    audioCtx: AudioContext;
    audioMasterGain: GainNode;
    buffer: string|AudioBuffer;
    source: AudioBufferSourceNode;
    gainNode: GainNode;
    panner: PannerNode;

    offset: number;
    startTime: number;
    isLooping: boolean;
    state: SoundStates;
    volume: number;
    pitch: number;
    pan: number;

    constructor(audioCtx: AudioContext, audioMasterGain: GainNode, buffer: string|AudioBuffer);
    destroy(): void;
    play(): void;
    stop(): void;
    pause(): void;
    getState(): SoundStates;
    setLoop(isLooping: boolean): void;
    setVolume(volume: number): void;
    setPan(pan: number): void;
    setPitch(pitch: number): void;
  }

  class EventEmitter implements NodeJS.EventEmitter {
    static listenerCount(emitter: EventEmitter, event: string): number;

    addListener(event: string, listener: Function): EventEmitter;
    on(event: string, listener: Function): EventEmitter;
    once(event: string, listener: Function): EventEmitter;
    removeListener(event: string, listener: Function): EventEmitter;
    removeAllListeners(event?: string): EventEmitter;
    setMaxListeners(n: number): void;
    listeners(event: string): Function[];
    emit(event: string, ...args: any[]): boolean;
  }
}
