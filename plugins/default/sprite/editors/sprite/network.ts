import ui, { setupProperty, setupAnimation, updateSelectedAnimation, setupMap } from "./ui";
import animationArea, { centerCamera as centerAnimationCamera } from "./animationArea";
import spritesheetArea, { updateSelection, centerCamera as centerSpritesheetCamera } from "./spritesheetArea";

import SpriteRenderer from "../../components/SpriteRenderer";
import SpriteRendererUpdater from "../../components/SpriteRendererUpdater";

export let data: { projectClient?: SupClient.ProjectClient; spriteUpdater?: SpriteRendererUpdater };

export let socket: SocketIOClient.Socket;
SupClient.i18n.load([{ root: `${window.location.pathname}/../..`, name: "spriteEditor" }], () => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
});

const onEditCommands: { [command: string]: Function; } = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  const spriteActor = new SupEngine.Actor(animationArea.gameInstance, "Sprite");
  const spriteRenderer = new SpriteRenderer(spriteActor);
  const config = { spriteAssetId: SupClient.query.asset, materialType: "basic", color: "ffffff" };

  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: (assetId, command, ...args) => { if (onEditCommands[command] != null) onEditCommands[command](...args); },
    onAssetTrashed: SupClient.onAssetTrashed
  };

  data.spriteUpdater = new SpriteRendererUpdater(data.projectClient, spriteRenderer, config, subscriber);
}

function onAssetReceived() {
  let pub = data.spriteUpdater.spriteAsset.pub;
  let texture = pub.textures[pub.mapSlots["map"]];

  spritesheetArea.spritesheet = {
    textures: { map: texture },
    filtering: pub.filtering,
    wrapping: pub.wrapping,
    pixelsPerUnit: pub.pixelsPerUnit,
    framesPerSecond: pub.framesPerSecond,
    alphaTest: pub.alphaTest,
    mapSlots: { map: "map" },

    grid: { width: 0, height: 0 },
    origin: { x: 0, y: 1 },
    animations: <any>[]
  };

  if (texture != null) {
    spritesheetArea.spritesheet.grid.width = texture.size.width;
    spritesheetArea.spritesheet.grid.height = texture.size.height;
    spritesheetArea.spritesheet.textures["map"].needsUpdate = true;
    spritesheetArea.spriteRenderer.setSprite(spritesheetArea.spritesheet);

    ui.imageSize.value = `${texture.size.width} × ${texture.size.height}`;
  }

  centerAnimationCamera();
  centerSpritesheetCamera();

  let width = texture != null ? texture.size.width / pub.grid.width : 1;
  let height = texture != null ? texture.size.height / pub.grid.height : 1;

  spritesheetArea.gridRenderer.setGrid({
    width, height,
    orthographicScale: 5,
    direction: -1,
    ratio: { x: pub.pixelsPerUnit / pub.grid.width, y: pub.pixelsPerUnit / pub.grid.height }
  });

  ui.allSettings.forEach((setting: string) => {
    let parts = setting.split(".");
    let obj = <any>pub;
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; });
    setupProperty(setting, obj[parts[parts.length - 1]]);
  });

  pub.animations.forEach((animation: any, index: number) => {
    setupAnimation(animation, index);
  });

  for (let mapName in pub.maps) if (pub.maps[mapName] != null) setupMap(mapName);
  for (let slotName in pub.mapSlots) ui.mapSlotsInput[slotName].value = pub.mapSlots[slotName] != null ? pub.mapSlots[slotName] : "";
}

onEditCommands["setProperty"] = (path: string, value: any) => {
  setupProperty(path, value);
};
onEditCommands["newAnimation"] = (animation: any, index: number) => { setupAnimation(animation, index); };

onEditCommands["deleteAnimation"] = (id: string) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id='${id}']`) as HTMLLIElement;
  ui.animationsTreeView.remove(animationElt);

  if (ui.selectedAnimationId === id) updateSelectedAnimation();
};

onEditCommands["moveAnimation"] = (id: string, index: number) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id='${id}']`) as HTMLLIElement;
  ui.animationsTreeView.insertAt(animationElt, "item", index);
};

onEditCommands["setAnimationProperty"] = (id: string, key: string, value: any) => {
  let animationElt = ui.animationsTreeView.treeRoot.querySelector(`li[data-id='${id}']`) as HTMLLIElement;

  switch (key) {
    case "name": animationElt.querySelector(".name").textContent = value; break;
    case "startFrameIndex":
      (animationElt.querySelector(".start-frame-index") as HTMLInputElement).value = value;
      if (id === ui.selectedAnimationId) updateSelection();
      break;
    case "endFrameIndex":
      (animationElt.querySelector(".end-frame-index") as HTMLInputElement).value = value;
      if (id === ui.selectedAnimationId) updateSelectedAnimation();
      break;
    case "speed":
      (animationElt.querySelector(".speed") as HTMLInputElement).value = value;
      break;
  }
};

function updateSpritesheet() {
  let pub = data.spriteUpdater.spriteAsset.pub;
  let texture = pub.textures[pub.mapSlots["map"]];
  if (texture == null) return;

  let asset = spritesheetArea.spritesheet;
  asset.textures["map"] = texture;
  asset.textures["map"].needsUpdate = true;
  asset.grid.width = texture.size.width;
  asset.grid.height = texture.size.height;
  asset.pixelsPerUnit = pub.pixelsPerUnit;
  spritesheetArea.spriteRenderer.setSprite(asset);
  spritesheetArea.gridRenderer.resize(texture.size.width / pub.grid.width, texture.size.height / pub.grid.height);

  updateSelectedAnimation();
  ui.imageSize.value = `${texture.size.width} × ${texture.size.height}`;
}

onEditCommands["setMaps"] = () => { updateSpritesheet(); };

onEditCommands["newMap"] = (name: string) => { setupMap(name); };

onEditCommands["renameMap"] = (oldName: string, newName: string) => {
  let pub = data.spriteUpdater.spriteAsset.pub;

  let textureElt = <HTMLLIElement>ui.texturesTreeView.treeRoot.querySelector(`[data-name="${oldName}"]`);
  textureElt.dataset["name"] = newName;
  textureElt.querySelector("span").textContent = newName;

  for (let slotName in pub.mapSlots)
    if (ui.mapSlotsInput[slotName].value === oldName) ui.mapSlotsInput[slotName].value = newName;
};

onEditCommands["deleteMap"] = (name: string) => {
  let textureElt = ui.texturesTreeView.treeRoot.querySelector(`li[data-name="${name}"]`) as HTMLLIElement;
  ui.texturesTreeView.remove(textureElt);

  let pub = data.spriteUpdater.spriteAsset.pub;
  for (let slotName in pub.mapSlots)
    if (ui.mapSlotsInput[slotName].value === name) ui.mapSlotsInput[slotName].value = "";
};

onEditCommands["setMapSlot"] = (slot: string, map: string) => {
  ui.mapSlotsInput[slot].value = map != null ? map : "";
  if (slot === "map") updateSpritesheet();
};
