import ui, { setupAnimation, updateSelectedAnimation, setupOpacity, setupMap } from "./ui";
import engine from "./engine";

import ModelRenderer from "../../components/ModelRenderer";
import ModelRendererUpdater from "../../components/ModelRendererUpdater";

export let data: { projectClient?: SupClient.ProjectClient; modelUpdater?: ModelRendererUpdater };

export let socket: SocketIOClient.Socket;

SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "modelEditor" }], () => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
});

let onEditCommands: any = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: false });

  let modelActor = new SupEngine.Actor(engine.gameInstance, "Model");
  let modelRenderer = new ModelRenderer(modelActor);
  let config: any = { modelAssetId: SupClient.query.asset, animationId: null, materialType: "phong" };
  let receiveCallbacks = { model: onAssetReceived };
  let editCallbacks = { model: onEditCommands };

  data.modelUpdater = new ModelRenderer.Updater(data.projectClient, modelRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived() {
  let pub = data.modelUpdater.modelAsset.pub;
  for (let index = 0; index < pub.animations.length; index++) {
    let animation = pub.animations[index];
    setupAnimation(animation, index);
  }

  ui.filteringSelect.value = pub.filtering;
  ui.wrappingSelect.value = pub.wrapping;
  ui.unitRatioInput.value = pub.unitRatio.toString();
  setupOpacity(pub.opacity);

  for (let mapName in pub.maps) if (pub.maps[mapName] != null) setupMap(mapName);
  for (let slotName in pub.mapSlots) ui.mapSlotsInput[slotName].value = pub.mapSlots[slotName] != null ? pub.mapSlots[slotName] : "";
}

export function editAsset(...args: any[]) {
  let callback: Function;
  if (typeof args[args.length - 1] === "function") callback = args.pop();

  args.push((err: string, id: string) => {
    if (err != null) { new SupClient.dialogs.InfoDialog(err, SupClient.i18n.t("common:actions.close")); return; }
    if (callback != null) callback(id);
  });
  socket.emit("edit:assets", SupClient.query.asset, ...args);
}

onEditCommands.setProperty = (path: string, value: any) => {
  switch (path) {
    case "filtering":
      ui.filteringSelect.value = value;
      break;
    case "wrapping":
      ui.wrappingSelect.value = value;
      break;
    case "unitRatio":
      ui.unitRatioInput.value = value.toString();
      break;
    case "opacity":
      setupOpacity(value);
      break;
  }
};

onEditCommands.newAnimation = (animation: any, index: number) => {
  setupAnimation(animation, index);
};

onEditCommands.deleteAnimation = (id: string) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id="${id}"]`) as HTMLLIElement;
  ui.animationsTreeView.remove(animationElt);
  if (ui.selectedAnimationId === id) updateSelectedAnimation();
};

onEditCommands.moveAnimation = (id: string, index: number) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id="${id}"]`) as HTMLLIElement;
  ui.animationsTreeView.insertAt(animationElt, "item", index);
};

onEditCommands.setAnimationProperty = (id: string, key: string, value: any) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id="${id}"]`) as HTMLLIElement;

  switch (key) {
    case "name": animationElt.querySelector(".name").textContent = value; break;
  }
};

onEditCommands.newMap = (name: string) => {
  setupMap(name);
};

onEditCommands.renameMap = (oldName: string, newName: string) => {
  let pub = data.modelUpdater.modelAsset.pub;

  let textureElt = <HTMLLIElement>ui.texturesTreeView.treeRoot.querySelector(`[data-name="${oldName}"]`);
  textureElt.dataset["name"] = newName;
  textureElt.querySelector("span").textContent = newName;

  for (let slotName in pub.mapSlots)
    if (ui.mapSlotsInput[slotName].value === oldName) ui.mapSlotsInput[slotName].value = newName;
};

onEditCommands.deleteMap = (name: string) => {
  let textureElt = ui.texturesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`) as HTMLLIElement;
  ui.texturesTreeView.remove(textureElt);

  let pub = data.modelUpdater.modelAsset.pub;
  for (let slotName in pub.mapSlots)
    if (ui.mapSlotsInput[slotName].value === name) ui.mapSlotsInput[slotName].value = "";
};

onEditCommands.setMapSlot = (slot: string, map: string) => {
  ui.mapSlotsInput[slot].value = map != null ? map : "";
};
