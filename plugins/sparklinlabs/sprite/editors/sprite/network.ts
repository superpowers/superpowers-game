import info from "./info";
import ui, { setupProperty, setupAnimation, updateSelectedAnimation } from "./ui";
import animationArea from "./animationArea";
import spritesheetArea from "./spritesheetArea";

import SpriteRenderer from "../../components/SpriteRenderer";
import SpriteRendererUpdater from "../../components/SpriteRendererUpdater";

export let data: { projectClient?: SupClient.ProjectClient; spriteUpdater?: SpriteRendererUpdater };

export let socket = SupClient.connect(info.projectId);
socket.on("connect", onConnected);
socket.on("disconnect", SupClient.onDisconnected);

let onEditCommands: any = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  let spriteActor = new SupEngine.Actor(animationArea.gameInstance, "Sprite");
  let spriteRenderer = new SpriteRenderer(spriteActor);
  let config = { spriteAssetId: info.assetId, materialType: "basic" };
  let receiveCallbacks = { sprite: onAssetReceived };
  let editCallbacks = { sprite: onEditCommands };

  data.spriteUpdater = new SpriteRendererUpdater(data.projectClient, spriteRenderer, config, receiveCallbacks, editCallbacks)
}

function onAssetReceived(url?: string) {
  if (url != null) spritesheetArea.image.src = url;

  ui.allSettings.forEach((setting: string) => {
    let parts = setting.split(".");
    let obj = data.spriteUpdater.spriteAsset.pub;
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; })
    setupProperty(setting, obj[parts[parts.length - 1]]);
  });

  data.spriteUpdater.spriteAsset.pub.animations.forEach((animation: any, index: number) => {
    setupAnimation(animation, index);
  });
}

onEditCommands.upload = (url: string) => {
  spritesheetArea.image.src = url;
}

onEditCommands.setProperty = (path: string, value: any) => {
  setupProperty(path, value);
}

onEditCommands.newAnimation = (animation: any, index: number) => {
  setupAnimation(animation, index);
}

onEditCommands.deleteAnimation = (id: string) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  ui.animationsTreeView.remove(animationElt);

  if (ui.selectedAnimationId === id) updateSelectedAnimation();
}

onEditCommands.moveAnimation = (id: string, index: number) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  ui.animationsTreeView.insertAt(animationElt, "item", index);
}

onEditCommands.setAnimationProperty = (id: string, key: string, value: any) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  switch (key) {
    case "name": { animationElt.querySelector(".name").textContent = value; break; }
    case "startFrameIndex": { animationElt.querySelector(".start-frame-index").value = value; break; }
    case "endFrameIndex": { animationElt.querySelector(".end-frame-index").value = value; break }
  }
}
