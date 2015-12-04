import ui, { setupProperty, setupAnimation, updateSelectedAnimation, setupAdvancedTextures, setupMap } from "./ui";
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

let onEditCommands: any = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  let spriteActor = new SupEngine.Actor(animationArea.gameInstance, "Sprite");
  let spriteRenderer = new SpriteRenderer(spriteActor);
  let config = { spriteAssetId: SupClient.query.asset, materialType: "basic" };
  let receiveCallbacks = { sprite: onAssetReceived };
  let editCallbacks = { sprite: onEditCommands };

  data.spriteUpdater = new SpriteRendererUpdater(data.projectClient, spriteRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived() {
  let pub = data.spriteUpdater.spriteAsset.pub;
  let texture = pub.textures[pub.mapSlots["map"]];
  let map = pub.maps[pub.mapSlots["map"]];

  spritesheetArea.spritesheet = {
    textures: { map: texture },
    filtering: pub.filtering,
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
    parts.slice(0, parts.length - 1).forEach((part) => { obj = obj[part]; })
    setupProperty(setting, obj[parts[parts.length - 1]]);
  });

  pub.animations.forEach((animation: any, index: number) => {
    setupAnimation(animation, index);
  });

  setupAdvancedTextures(pub.advancedTextures);
  for (let mapName in pub.maps) if (pub.maps[mapName] != null) setupMap(mapName);
  for (let slotName in pub.mapSlots) ui.mapSlotsInput[slotName].value = pub.mapSlots[slotName] != null ? pub.mapSlots[slotName] : "";
}

export function editAsset(...args: any[]) {
  let callback: Function;
  if (typeof args[args.length-1] === "function") callback = args.pop();

  args.push((err: string, id: string) => {
    if (err != null) { alert(err); return; }
    if (callback != null) callback(id);
  });
  socket.emit("edit:assets", SupClient.query.asset, ...args);
}

onEditCommands.setProperty = (path: string, value: any) => {
  if (path === "advancedTextures") setupAdvancedTextures(value);
  else setupProperty(path, value);
};
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
    case "speed":
      animationElt.querySelector(".speed").value = value;
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

onEditCommands.setMaps = () => { updateSpritesheet() };

onEditCommands.newMap = (name: string) => { setupMap(name); }

onEditCommands.renameMap = (oldName: string, newName: string) => {
  let pub = data.spriteUpdater.spriteAsset.pub;

  let textureElt = <HTMLLIElement>ui.texturesTreeView.treeRoot.querySelector(`[data-name="${oldName}"]`);
  textureElt.dataset["name"] = newName;
  textureElt.querySelector("span").textContent = newName;

  for (let slotName in pub.mapSlots)
    if (ui.mapSlotsInput[slotName].value === oldName) ui.mapSlotsInput[slotName].value = newName;
}

onEditCommands.deleteMap = (name: string) => {
  let textureElt = ui.texturesTreeView.treeRoot.querySelector(`[data-name="${name}"]`);
  ui.texturesTreeView.remove(textureElt);

  let pub = data.spriteUpdater.spriteAsset.pub;
  for (let slotName in pub.mapSlots)
    if (ui.mapSlotsInput[slotName].value === name) ui.mapSlotsInput[slotName].value = "";
}

onEditCommands.setMapSlot = (slot: string, map: string) => {
  ui.mapSlotsInput[slot].value = map != null ? map : "";
  if (slot === "map") updateSpritesheet();
}
