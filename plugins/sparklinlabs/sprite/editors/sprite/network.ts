import info from "./info";
import ui, { setupProperty, setupAnimation, updateSelectedAnimation } from "./ui";
import animationArea, { centerCamera as centerAnimationCamera } from "./animationArea";
import spritesheetArea, { updateSelection, centerCamera as centerSpritesheetCamera } from "./spritesheetArea";

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

  data.spriteUpdater = new SpriteRendererUpdater(data.projectClient, spriteRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived() {
  let pub = data.spriteUpdater.spriteAsset.pub;
  let texture = pub.textures["map"];

  spritesheetArea.spritesheet = {
    textures: { map: ((<any>pub.maps["map"]).byteLength !== 0) ? texture.clone() : null },
    filtering: pub.filtering,
    pixelsPerUnit: pub.pixelsPerUnit,
    framesPerSecond: pub.framesPerSecond,
    alphaTest: pub.alphaTest,

    grid: { width: texture.image.width, height: texture.image.height },
    origin: { x: 0, y: 1 },
    animations: <any>[]
  };

  if ((<any>pub.maps["map"]).byteLength !== 0) {
    spritesheetArea.spritesheet.textures["map"].needsUpdate = true;
    spritesheetArea.spriteRenderer.setSprite(spritesheetArea.spritesheet);

    ui.imageLabel.width.textContent = texture.image.width;
    ui.imageLabel.height.textContent = texture.image.height;
  }

  spritesheetArea.gridRenderer.setGrid({
    width: texture.image.width / pub.grid.width,
    height: texture.image.height / pub.grid.height,
    orthographicScale: 5,
    direction: -1,
    ratio: { x: pub.pixelsPerUnit / pub.grid.width, y: pub.pixelsPerUnit / pub.grid.height }
  });

  centerAnimationCamera();
  centerSpritesheetCamera();

  ui.allSettings.forEach((setting: string) => {
    let parts = setting.split(".");
    let obj = <any>pub;
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; })
    setupProperty(setting, obj[parts[parts.length - 1]]);
  });

  pub.animations.forEach((animation: any, index: number) => {
    setupAnimation(animation, index);
  });
}

onEditCommands.upload = () => {
  let pub = data.spriteUpdater.spriteAsset.pub;
  let texture = pub.textures["map"];

  let asset = spritesheetArea.spritesheet;
  asset.textures["map"] = texture.clone();
  asset.textures["map"].needsUpdate = true;
  asset.grid.width = texture.image.width;
  asset.grid.height = texture.image.height;
  asset.pixelsPerUnit = pub.pixelsPerUnit;
  spritesheetArea.spriteRenderer.setSprite(asset);

  spritesheetArea.gridRenderer.resize(texture.image.width / pub.grid.width, texture.image.height / pub.grid.height);

  updateSelectedAnimation();

  ui.imageLabel.width.textContent = texture.image.width;
  ui.imageLabel.height.textContent = texture.image.height;
};

onEditCommands.setProperty = (path: string, value: any) => { setupProperty(path, value); };
onEditCommands.newAnimation = (animation: any, index: number) => { setupAnimation(animation, index); };

onEditCommands.deleteAnimation = (id: string) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  ui.animationsTreeView.remove(animationElt);

  if (ui.selectedAnimationId === id) updateSelectedAnimation();
};

onEditCommands.moveAnimation = (id: string, index: number) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  ui.animationsTreeView.insertAt(animationElt, "item", index);
};

onEditCommands.setAnimationProperty = (id: string, key: string, value: any) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`[data-id='${id}']`);

  switch (key) {
    case "name": animationElt.querySelector(".name").textContent = value; break;
    case "startFrameIndex":
      animationElt.querySelector(".start-frame-index").value = value;
      if (id == ui.selectedAnimationId) updateSelection();
      break;
    case "endFrameIndex":
      animationElt.querySelector(".end-frame-index").value = value;
      if (id == ui.selectedAnimationId) updateSelection();
      break;
  }
};
