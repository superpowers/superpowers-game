let THREE = SupEngine.THREE;

let engine: {
  gameInstance?: SupEngine.GameInstance;
  tickAnimationFrameId?: number;
} = {};
export default engine;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");
engine.gameInstance = new SupEngine.GameInstance(canvasElt);

let cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
new SupEngine.editorComponentClasses["Camera3DControls"](cameraActor, cameraComponent);

let light = new THREE.AmbientLight(0xcfcfcf);
engine.gameInstance.threeScene.add(light);

let spotLight = new THREE.PointLight(0xffffff, 0.2);
spotLight.position.set(0, 0, -5);
cameraActor.threeObject.add(spotLight);
spotLight.updateMatrixWorld(false);

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp=0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) engine.gameInstance.draw();
  engine.tickAnimationFrameId = requestAnimationFrame(tick);
}
engine.tickAnimationFrameId = requestAnimationFrame(tick);
