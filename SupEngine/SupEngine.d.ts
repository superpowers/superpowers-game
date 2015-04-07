///<reference path="../../typings/tsd.d.ts"/>
/// <reference path="./typings/threejs/three.d.ts"/>

declare var __tmpTHREE: typeof THREE;

declare module SupEngine {
  var THREE: typeof __tmpTHREE;

  var editorComponentClasses: any;
  function registerEditorComponentClass(name: string, component: any);

  var componentClasses: any;
  function registerComponentClass(name: string, plugin: any);

  var componentEditorClasses: any;
  function registerComponentEditorClass(name: string, plugin: any);

  var earlyUpdateFunctions: any;
  function registerEarlyUpdateFunction(name: string, callback);

  class GameInstance extends EventEmitter {
    static framesPerSecond: number;

    debug: boolean;
    tree: SupEngine.ActorTree;
    cachedActors: SupEngine.Actor[];
    renderComponents; // SupEngine.components.Camera[]
    componentsToBeStarted: SupEngine.ActorComponent[];
    componentsToBeDestroyed: SupEngine.ActorComponent[];
    actorsToBeDestroyed: SupEngine.Actor[];
    skipRendering: boolean;
    exited: boolean;

    input: SupEngine.Input;
    audio: SupEngine.Audio;

    threeRenderer: THREE.WebGLRenderer;
    threeScene: THREE.Scene;

    constructor(canvas: HTMLCanvasElement, options: {debug?: boolean});
    update();
    draw();
    clear();
    destroyComponent(component: SupEngine.ActorComponent);
    destroyActor(actor: SupEngine.Actor);
    destroyAllActors();
    _doComponentDestruction(component: SupEngine.ActorComponent) ;
    _doActorDestruction(actor: SupEngine.Actor);
  }

  class ActorTree {
    root: Actor[];

    constructor();
    _walkRecurseTopDown(node: Actor, parentNode: Actor, callback: (node: Actor, parentNode?: Actor) => any);
    walkTopDown(callback: (node: Actor, parentNode?: Actor) => any);
    walkDown(rootNode: Actor, callback: (node: Actor, parentNode?: Actor) => any);
  }

  class Actor {
    gameInstance: GameInstance;
    name: string;
    parent: Actor;
    threeObject: THREE.Object3D;

    children: Actor[];
    components: ActorComponent[];
    pendingForDestruction: boolean;

    constructor(gameInstance: GameInstance, name: string, parent: Actor);
    // We have to duplicate the components list because a script could add more
    // components to the actor during the loop and they will be awoken automatically
    awake();
    // Same here, a script component could create additional components and they
    // should only be updated after being started during the next loop
    update();

    // Transform
    getGlobalMatrix(): THREE.Matrix4;
    getGlobalPosition(): THREE.Vector3;
    getLocalPosition(): THREE.Vector3;
    getGlobalOrientation(): THREE.Quaternion;
    getGlobalEulerAngles(): THREE.Euler;
    getLocalOrientation(): THREE.Quaternion;
    getLocalEulerAngles(): THREE.Euler;
    getLocalScale(): THREE.Vector3;
    getParentGlobalOrientation();

    setGlobalMatrix(matrix: THREE.Matrix4);
    setGlobalPosition(pos: THREE.Vector3);
    setLocalPosition(pos: THREE.Vector3);
    lookAt(target: THREE.Vector3, up: THREE.Vector3);
    lookTowards(direction: THREE.Vector3, up?: THREE.Vector3);

    setLocalOrientation(quaternion: THREE.Quaternion);
    setGlobalOrientation(quaternion: THREE.Quaternion);
    setLocalEulerAngles(eulerAngles: THREE.Euler);
    setGlobalEulerAngles(eulerAngles: THREE.Euler);
    setLocalScale(scale: THREE.Vector3);
    setParent(newParent: Actor, keepLocal: boolean);

    rotateGlobal(quaternion: THREE.Quaternion);
    rotateLocal(quaternion: THREE.Quaternion);
    rotateGlobalEulerAngles(eulerAngles: THREE.Euler);
    rotateLocalEulerAngles(eulerAngles: THREE.Euler);
    moveGlobal(offset: THREE.Vector3);
    moveLocal(offset: THREE.Vector3);
    moveOriented(offset: THREE.Vector3);

    _destroy();
    _markDestructionPending();
  }


  class ActorComponent {
    actor: Actor;
    typeName: string;

    constructor(actor: Actor, typeName: string);
    _destroy();
    awake();
    start();
    update();
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
    destroy();
    reset();
    update();
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
    destroy();
    play();
    stop();
    pause();
    getState(): SoundStates;
    setLoop(isLooping: boolean);
    setVolume(volume: number);
    setPan(pan: number);
    setPitch(pitch: number);
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
