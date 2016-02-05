let THREE = SupEngine.THREE;

let engine: {
  gameInstance?: SupEngine.GameInstance;
} = {};
export default engine;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");
engine.gameInstance = new SupEngine.GameInstance(canvasElt);

let cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
/* tslint:disable:no-unused-expression */
new SupEngine.editorComponentClasses["Camera3DControls"](cameraActor, cameraComponent);
/* tslint:enable:no-unused-expression */

let light = new THREE.AmbientLight(0xcfcfcf);
engine.gameInstance.threeScene.add(light);

let spotLight = new THREE.PointLight(0xffffff, 0.2);
cameraActor.threeObject.add(spotLight);
spotLight.updateMatrixWorld(false);

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp = 0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) engine.gameInstance.draw();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
