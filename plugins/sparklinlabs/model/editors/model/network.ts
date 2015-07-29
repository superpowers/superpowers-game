import info from "./info";
import ui, { setupAnimation, updateSelectedAnimation } from "./ui";
import engine from "./engine";

import ModelRenderer from "../../components/ModelRenderer";
import ModelRendererUpdater from "../../components/ModelRendererUpdater";

export let data: { projectClient?: SupClient.ProjectClient; modelUpdater?: ModelRendererUpdater };

export let socket: SocketIOClient.Socket;

socket = SupClient.connect(info.projectId);
socket.on("connect", onConnected);
socket.on("disconnect", SupClient.onDisconnected);

let onEditCommands: any = {};
function onConnected() {
  data = {}
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: false });

  let modelActor = new SupEngine.Actor(engine.gameInstance, "Model");
  let modelRenderer = new ModelRenderer(modelActor);
  let config: any = { modelAssetId: info.assetId, animationId: null, materialType: "basic" };
  let receiveCallbacks = { model: onAssetReceived };
  let editCallbacks = { model: onEditCommands };

  data.modelUpdater = new ModelRenderer.Updater(data.projectClient, modelRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived() {
  for (let index = 0; index < data.modelUpdater.modelAsset.pub.animations.length; index++) {
    let animation = data.modelUpdater.modelAsset.pub.animations[index];
    setupAnimation(animation, index);
  }
}

onEditCommands.newAnimation = (animation: any, index: number) => {
  setupAnimation(animation, index);
};

onEditCommands.deleteAnimation = (id: string) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  ui.animationsTreeView.remove(animationElt);
  if (ui.selectedAnimationId === id) updateSelectedAnimation();
};

onEditCommands.moveAnimation = (id: string, index: number) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id="${id}"]`);
  ui.animationsTreeView.insertAt(animationElt, "item", index);
};

onEditCommands.setAnimationProperty = (id: string, key: string, value: any) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id="${id}"]`);

  switch (key) {
    case "name": animationElt.querySelector(".name").textContent = value; break;
  }
};

onEditCommands.setProperty = (path: string, value: any) => {
  switch (path) {
    case "opacity":
      ui.opacityInput.value = value;
      ui.opacityInput.disabled = value == null;
      ui.opacityCheckbox.checked = value != null
      break;
  }
}
