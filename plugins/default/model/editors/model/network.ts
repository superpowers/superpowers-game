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

const onEditCommands: { [command: string]: Function } = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: false });

  const modelActor = new SupEngine.Actor(engine.gameInstance, "Model");
  const modelRenderer = new ModelRenderer(modelActor);
  const config = { modelAssetId: SupClient.query.asset, materialType: "phong", color: "ffffff" };

  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: (assetId, command, ...args) => { if (onEditCommands[command] != null) onEditCommands[command](...args); },
    onAssetTrashed: SupClient.onAssetTrashed
  };

  data.modelUpdater = new ModelRendererUpdater(data.projectClient, modelRenderer, config, subscriber);
}

function onAssetReceived() {
  const pub = data.modelUpdater.modelAsset.pub;
  for (let index = 0; index < pub.animations.length; index++) {
    const animation = pub.animations[index];
    setupAnimation(animation, index);
  }

  ui.filteringSelect.value = pub.filtering;
  ui.wrappingSelect.value = pub.wrapping;
  ui.unitRatioInput.value = pub.unitRatio.toString();
  setupOpacity(pub.opacity);

  for (let mapName in pub.maps) if (pub.maps[mapName] != null) setupMap(mapName);
  for (let slotName in pub.mapSlots) ui.mapSlotsInput[slotName].value = pub.mapSlots[slotName] != null ? pub.mapSlots[slotName] : "";
}

onEditCommands["setProperty"] = (path: string, value: any) => {
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

onEditCommands["newAnimation"] = (animation: any, index: number) => {
  setupAnimation(animation, index);
};

onEditCommands["deleteAnimation"] = (id: string) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id="${id}"]`) as HTMLLIElement;
  ui.animationsTreeView.remove(animationElt);
  if (ui.selectedAnimationId === id) updateSelectedAnimation();
};

onEditCommands["moveAnimation"] = (id: string, index: number) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id="${id}"]`) as HTMLLIElement;
  ui.animationsTreeView.insertAt(animationElt, "item", index);
};

onEditCommands["setAnimationProperty"] = (id: string, key: string, value: any) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id="${id}"]`) as HTMLLIElement;

  switch (key) {
    case "name": animationElt.querySelector(".name").textContent = value; break;
  }
};

onEditCommands["newMap"] = (name: string) => {
  setupMap(name);
};

onEditCommands["renameMap"] = (oldName: string, newName: string) => {
  let pub = data.modelUpdater.modelAsset.pub;

  let textureElt = <HTMLLIElement>ui.texturesTreeView.treeRoot.querySelector(`[data-name="${oldName}"]`);
  textureElt.dataset["name"] = newName;
  textureElt.querySelector("span").textContent = newName;

  for (let slotName in pub.mapSlots)
    if (ui.mapSlotsInput[slotName].value === oldName) ui.mapSlotsInput[slotName].value = newName;
};

onEditCommands["deleteMap"] = (name: string) => {
  let textureElt = ui.texturesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`) as HTMLLIElement;
  ui.texturesTreeView.remove(textureElt);

  let pub = data.modelUpdater.modelAsset.pub;
  for (let slotName in pub.mapSlots)
    if (ui.mapSlotsInput[slotName].value === name) ui.mapSlotsInput[slotName].value = "";
};

onEditCommands["setMapSlot"] = (slot: string, map: string) => {
  ui.mapSlotsInput[slot].value = map != null ? map : "";
};
