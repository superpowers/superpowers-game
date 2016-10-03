const THREE = SupEngine.THREE;

const engine: {
  gameInstance?: SupEngine.GameInstance;
} = {};
export default engine;

const canvasElt = <HTMLCanvasElement>document.querySelector("canvas");
engine.gameInstance = new SupEngine.GameInstance(canvasElt);

const cameraActor = new SupEngine.Actor(engine.gameInstance, "Camera");
cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));
const cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
new SupEngine.editorComponentClasses["Camera3DControls"](cameraActor, cameraComponent);

const light = new THREE.AmbientLight(0xcfcfcf);
engine.gameInstance.threeScene.add(light);

const spotLight = new THREE.PointLight(0xffffff, 0.2);
cameraActor.threeObject.add(spotLight);
spotLight.updateMatrixWorld(false);

let isTabActive = true;
let animationFrame: number;

window.addEventListener("message", (event) => {
  if (event.data.type === "deactivate" || event.data.type === "activate") {
    isTabActive = event.data.type === "activate";
    onChangeActive();
  }
});

function onChangeActive() {
  const stopRendering = !isTabActive;

  if (stopRendering) {
    if (animationFrame != null) {
      cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
  } else if (animationFrame == null) {
    animationFrame = requestAnimationFrame(tick);
  }
}

let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp = 0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  const { updates, timeLeft } = engine.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) engine.gameInstance.draw();
  animationFrame = requestAnimationFrame(tick);
}
animationFrame = requestAnimationFrame(tick);
