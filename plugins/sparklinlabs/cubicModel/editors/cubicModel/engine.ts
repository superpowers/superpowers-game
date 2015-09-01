let THREE = SupEngine.THREE;

let engine: {
  gameInstance?: SupEngine.GameInstance;

  cameraActor?: SupEngine.Actor;
} = {};
export default engine;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");
engine.gameInstance = new SupEngine.GameInstance(canvasElt);

engine.cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
engine.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](engine.cameraActor);
new SupEngine.editorComponentClasses["Camera3DControls"](engine.cameraActor, cameraComponent);

let light = new THREE.AmbientLight(0xcfcfcf);
engine.gameInstance.threeScene.add(light);

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp=0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) engine.gameInstance.draw();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
