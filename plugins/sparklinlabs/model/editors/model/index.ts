import * as async from "async";
import * as querystring from "querystring";

import ModelRenderer from "../../components/ModelRenderer";
import ModelRendererUpdater from "../../components/ModelRendererUpdater";

import importModel from "./importers/index";

let TreeView = require("dnd-tree-view");
let THREE = SupEngine.THREE;

let qs = querystring.parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset };
let data: { projectClient?: SupClient.ProjectClient; modelUpdater?: ModelRendererUpdater };
let ui: any = {};
let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  // Model upload
  let modelFileSelect = <HTMLInputElement> document.querySelector(".model input.file-select");
  modelFileSelect.addEventListener("change", onModelFileSelectChange);
  document.querySelector(".model button.upload").addEventListener("click", () => { modelFileSelect.click(); });

  // Diffuse map upload
  let diffuseMapFileSelect = <HTMLInputElement>document.querySelector(".diffuse-map input.file-select")
  diffuseMapFileSelect.addEventListener("change", onDiffuseMapFileSelectChange);
  document.querySelector(".diffuse-map button.upload").addEventListener("click", () => { diffuseMapFileSelect.click(); });

  // Animations
  ui.animationsTreeView = new TreeView(document.querySelector(".animations-tree-view"), onAnimationDrop);
  ui.animationsTreeView.on("selectionChange", updateSelectedAnimation);

  document.querySelector("button.new-animation").addEventListener("click", onNewAnimationClick);

  // Animation upload
  let animationFileSelect = <HTMLInputElement>document.querySelector(".upload-animation.file-select");
  animationFileSelect.addEventListener("change", onAnimationFileSelectChange);
  document.querySelector("button.upload-animation").addEventListener("click", () => { animationFileSelect.click(); });
  document.querySelector("button.rename-animation").addEventListener("click", onRenameAnimationClick);
  document.querySelector("button.delete-animation").addEventListener("click", onDeleteAnimationClick);

  // Setup 3D viewport
  let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");
  ui.gameInstance = new SupEngine.GameInstance(canvasElt);

  ui.cameraActor = new SupEngine.Actor(ui.gameInstance, "Camera");
  ui.cameraActor.setLocalPosition(new THREE.Vector3(0, 3, 10));
  let cameraComponent = new SupEngine.componentClasses["Camera"](ui.cameraActor);
  new SupEngine.editorComponentClasses["Camera3DControls"](ui.cameraActor, cameraComponent);

  ui.modelActor = new SupEngine.Actor(ui.gameInstance, "Model");
  ui.modelRenderer = new ModelRenderer(ui.modelActor);

  ui.tickAnimationFrameId = requestAnimationFrame(tick);
}

// Network callbacks
let onEditCommands: any = {};
function onConnected() {
  data = {}
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: false });

  let modelActor = new SupEngine.Actor(ui.gameInstance, "Model");
  let modelRenderer = new ModelRenderer(modelActor);
  let config: { modelAssetId: string; animationId: string } = { modelAssetId: info.assetId, animationId: null };
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

// User interface
function onModelFileSelectChange(event: any) {
  if (event.target.files.length === 0) return;

  importModel(event.target.files, (err, data) => {
    event.target.parentElement.reset();

    if (err != null) { alert(`Could not import files: ${err.message}`); return; }

    socket.emit("edit:assets", info.assetId, "setAttributes", data.attributes, (err: string) => {
      if (err != null) { alert(err); return; }
    });

    socket.emit("edit:assets", info.assetId, "setBones", data.bones, (err: string) => {
      if (err != null) { alert(err); return; }
    });

    if (data.maps != null) {
      socket.emit("edit:assets", info.assetId, "setMaps", data.maps, (err: string) => {
        if (err != null) { alert(err); return; }
      });
    }
  });
}

function onDiffuseMapFileSelectChange(event: any) {
  let reader = new FileReader;
  reader.onload = (event) => {
    socket.emit("edit:assets", info.assetId, "setMaps", { diffuse: reader.result }, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  };

  reader.readAsArrayBuffer(event.target.files[0]);
  event.target.parentElement.reset();
  return
}

function onNewAnimationClick() {
  SupClient.dialogs.prompt("Enter a name for the animation.", null, "Animation", "Create", (name) => {
    if (name == null) return;

    socket.emit("edit:assets", info.assetId, "newAnimation", name, null, null, (err: string, animationId: string) => {
      if (err != null) { alert(err); return; }

      ui.animationsTreeView.clearSelection();
      ui.animationsTreeView.addToSelection(ui.animationsTreeView.treeRoot.querySelector(`li[data-id="${animationId}"]`));
      updateSelectedAnimation();
    });
  });
}

function onAnimationFileSelectChange(event: any) {
  if(event.target.files.length === 0) return;

  let animationId: string = ui.selectedAnimationId;

  importModel(event.target.files, (err: Error, data: any) => {
    event.target.parentElement.reset();

    if (err != null) { alert(`Could not import files: ${err.message}`); return; }
    if (data.animation == null) { alert("No animation found in imported files"); return; }

    // TODO: Check if bones are compatible

    socket.emit("edit:assets", info.assetId, "setAnimation", animationId, data.animation.duration, data.animation.keyFrames, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });
}

function onRenameAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.animationsTreeView.selectedNodes[0];
  let animation = data.modelUpdater.modelAsset.animations.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new name for the animation.", null, animation.name, "Rename", (newName) => {
    if (newName == null) return;

    socket.emit("edit:assets", info.assetId, "setAnimationProperty", animation.id, "name", newName, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  });
}

function onDeleteAnimationClick() {
  if (ui.animationsTreeView.selectedNodes.length === 0) return;

  SupClient.dialogs.confirm("Are you sure you want to delete the selected animations?", "Delete", (confirm) => {
    if (!confirm) return;

    for (let selectedNode of ui.animationsTreeView.selectedNodes) {
      socket.emit("edit:assets", info.assetId, "deleteAnimation", selectedNode.dataset.id, (err: string) => {
        if (err != null) { alert(err); return; }
      });
    }
  });
}

function onAnimationDrop(dropInfo: any, orderedNodes: HTMLLIElement[]) {
  let animationIds: string[] = [];
  for (let animation of orderedNodes) animationIds.push(animation.dataset["id"]);

  let index = SupClient.getListViewDropIndex(dropInfo, data.modelUpdater.modelAsset.animations);

  for (let i = 0; i < animationIds.length; i++) {
    let id = animationIds[i];
    socket.emit("edit:assets", info.assetId, "moveAnimation", id, index + i, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  }

  return false;
}

function updateSelectedAnimation() {
  let selectedAnimElt = ui.animationsTreeView.selectedNodes[0]
  if (selectedAnimElt != null) ui.selectedAnimationId = selectedAnimElt.dataset.id;
  else ui.selectedAnimationId = null;

  let buttons = document.querySelectorAll(".animations-buttons button");
  for (let i = 0; i < buttons.length; i++) {
    let button = <HTMLButtonElement>buttons[i];
    button.disabled = ui.selectedAnimationId == null && button.className !== "new-animation";
  }
  
  data.modelUpdater.config_setProperty("animationId", ui.selectedAnimationId);
}

function setupAnimation(animation: any, index: number) {
  let liElt = document.createElement("li");
  liElt.dataset["id"] = animation.id;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = animation.name;
  liElt.appendChild(nameSpan);

  ui.animationsTreeView.insertAt(liElt, "item", index, null);
}

// Engine
function tick() {
  // FIXME: decouple update interval from render interval
  ui.gameInstance.update();
  ui.gameInstance.draw();
  ui.tickAnimationFrameId = requestAnimationFrame(tick);
}

// Start
start();
