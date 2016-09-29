import ui from "./ui";
import { data } from "./network";
import { createShaderMaterial } from "../../components/Shader";

const THREE = SupEngine.THREE;

const canvasElt = <HTMLCanvasElement>document.querySelector("canvas");
const gameInstance = new SupEngine.GameInstance(canvasElt);

const cameraActor = new SupEngine.Actor(gameInstance, "Camera");
cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));
const cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
new SupEngine.editorComponentClasses["Camera3DControls"](cameraActor, cameraComponent);

const loader = new THREE.TextureLoader();
const leonardTexture = loader.load("leonard.png", undefined);
leonardTexture.magFilter = THREE.NearestFilter;
leonardTexture.minFilter = THREE.NearestFilter;

let previewActor: SupEngine.Actor;
let material: THREE.ShaderMaterial;

export function setupPreview(options = { useDraft: false }) {
  if (previewActor != null) {
    gameInstance.destroyActor(previewActor);
    previewActor = null;
  }
  if (data.previewComponentUpdater != null) {
    data.previewComponentUpdater.destroy();
    data.previewComponentUpdater = null;
  }
  if (material != null) {
    material.dispose();
    material = null;
  }

  if (ui.previewTypeSelect.value === "Asset" && ui.previewEntry == null) return;

  previewActor = new SupEngine.Actor(gameInstance, "Preview");
  let previewGeometry: THREE.BufferGeometry;
  switch (ui.previewTypeSelect.value) {
    case "Plane":
      previewGeometry = new THREE.PlaneBufferGeometry(2, 2);
      break;
    case "Box":
      previewGeometry = new THREE.BufferGeometry().fromGeometry(new THREE.BoxGeometry(2, 2, 2));
      break;
    case "Sphere":
      previewGeometry = new THREE.BufferGeometry().fromGeometry(new THREE.SphereGeometry(2, 12, 12));
      break;
    case "Asset":
      let componentClassName: string;
      const config = { materialType: "shader", shaderAssetId: SupClient.query.asset, spriteAssetId: <string>null, modelAssetId: <string>null };
      if (ui.previewEntry.type === "sprite") {
        componentClassName = "SpriteRenderer";
        config.spriteAssetId = ui.previewEntry.id;
      } else {
        componentClassName = "ModelRenderer";
        config.modelAssetId = ui.previewEntry.id;
      }

      const componentClass = SupEngine.componentClasses[componentClassName];
      const component = new componentClass(previewActor);
      data.previewComponentUpdater = new componentClass.Updater(data.projectClient, component, config);
      return;
  }
  material = createShaderMaterial(data.shaderAsset.pub, { map: leonardTexture }, previewGeometry, options);
  previewActor.threeObject.add(new THREE.Mesh(previewGeometry, material));
  gameInstance.update();
  gameInstance.draw();
}

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
  animationFrame = requestAnimationFrame(tick);

  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  const { updates, timeLeft } = gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates !== 0 && material != null)
    for (let i = 0; i < updates; i++)
      material.uniforms.time.value += 1 / gameInstance.framesPerSecond;

  gameInstance.draw();
}
animationFrame = requestAnimationFrame(tick);
