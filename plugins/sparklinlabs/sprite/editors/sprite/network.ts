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

function onAssetReceived() {
  let pub = data.spriteUpdater.spriteAsset.pub;
  if (pub.texture != null) {
    let asset = {
      texture: pub.texture.clone(),
      filtering: pub.filtering,
      pixelsPerUnit: pub.pixelsPerUnit,
      framesPerSecond: pub.framesPerSecond,
      alphaTest: pub.alphaTest,

      grid: { width: pub.texture.image.width, height: pub.texture.image.height },
      origin: { x: 0.5, y: 0.5 },
      animations: <any>[]
    };
    asset.texture.needsUpdate = true;
    spritesheetArea.spriteRenderer.setSprite(asset);
  }

  ui.allSettings.forEach((setting: string) => {
    let parts = setting.split(".");
    let obj = pub;
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; })
    setupProperty(setting, obj[parts[parts.length - 1]]);
  });

  pub.animations.forEach((animation: any, index: number) => {
    setupAnimation(animation, index);
  });
}

onEditCommands.upload = () => {
  let pub = data.spriteUpdater.spriteAsset.pub;

  let asset = spritesheetArea.spriteRenderer.asset;
  asset.texture = pub.texture.clone();
  asset.texture.needsUpdate = true;
  asset.grid.width = pub.texture.image.width;
  asset.grid.height = pub.texture.image.height;

  spritesheetArea.spriteRenderer.setSprite(asset);
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
