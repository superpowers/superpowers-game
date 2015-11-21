import ui from "./ui";
import { data } from "./network";
import { createShaderMaterial } from "../../components/Shader";

let THREE = SupEngine.THREE;

let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");
let gameInstance = new SupEngine.GameInstance(canvasElt);

let cameraActor = new SupEngine.Actor(gameInstance, "Camera");
cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));
let cameraComponent = new SupEngine.componentClasses["Camera"](cameraActor);
let cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](cameraActor, cameraComponent);

let leonardTexture = THREE.ImageUtils.loadTexture("/plugins/sparklinlabs/shader/editors/shader/leonard.png");
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
      let config = { materialType: "shader", shaderAssetId: SupClient.query.asset, spriteAssetId: <string>null, modelAssetId: <string>null };
      if (ui.previewEntry.type === "sprite") {
        componentClassName = "SpriteRenderer";
        config.spriteAssetId = ui.previewEntry.id;
      } else {
        componentClassName = "ModelRenderer";
        config.modelAssetId = ui.previewEntry.id;
      }

      let componentClass = SupEngine.componentClasses[componentClassName];
      let component = new componentClass(previewActor);
      data.previewComponentUpdater = new componentClass.Updater(
        data.projectClient,
        component,
        config
      );
      return;
  }
  material = createShaderMaterial(data.shaderAsset.pub, { map: leonardTexture }, previewGeometry, options);
  previewActor.threeObject.add(new THREE.Mesh(previewGeometry, material));
  gameInstance.update();
  gameInstance.draw();
}

let lastTimestamp = 0;
let accumulatedTime = 0;
let frame = 0;
function tick(timestamp=0) {
  requestAnimationFrame(tick);

  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates !== 0 && material != null)
    for (let i = 0; i < updates; i++)
      material.uniforms.time.value += 1 / gameInstance.framesPerSecond;

  gameInstance.draw();
}
requestAnimationFrame(tick);
