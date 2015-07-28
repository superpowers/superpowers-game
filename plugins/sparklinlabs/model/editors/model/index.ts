import * as async from "async";
import * as querystring from "querystring";

import ModelRenderer from "../../components/ModelRenderer";
import ModelRendererUpdater from "../../components/ModelRendererUpdater";

import importModel from "./importers/index";

let PerfectResize = require("perfect-resize");

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

  // Primary map upload
  let primaryMapFileSelect = <HTMLInputElement>document.querySelector(".map input.file-select")
  primaryMapFileSelect.addEventListener("change", onPrimaryMapFileSelectChange);
  document.querySelector(".map button.upload").addEventListener("click", () => { primaryMapFileSelect.click(); });

  // Show skeleton
  let showSkeletonCheckbox = <HTMLInputElement>document.querySelector(".show-skeleton");
  showSkeletonCheckbox.addEventListener("change", onShowSkeletonChange);

  // Opacity
  ui.opacityCheckbox = <HTMLInputElement>document.querySelector("input.opacity-checkbox");
  ui.opacityCheckbox.addEventListener("click", onCheckOpacity);

  ui.opacityInput = <HTMLInputElement>document.querySelector("input.property-opacity");
  ui.opacityInput.addEventListener("input", onChangeOpacity);

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

  // Advanced textures
  let texturesPanes = document.querySelector(".advanced-textures");
  new PerfectResize(texturesPanes, "bottom");

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

  // Error pane
  ui.errorPane = <HTMLDivElement>document.querySelector(".error-pane");
  ui.errorPaneStatus = <HTMLDivElement>ui.errorPane.querySelector(".status");
  ui.errorPaneInfo = <HTMLDivElement>ui.errorPaneStatus.querySelector(".info");
  ui.errorsTBody = <HTMLTableSectionElement>ui.errorPane.querySelector(".errors tbody");

  let errorPaneResizeHandle = new PerfectResize(ui.errorPane, "bottom");
  errorPaneResizeHandle.handleElt.classList.add("disabled");

  let errorPaneToggleButton = ui.errorPane.querySelector("button.toggle");

  ui.errorPaneStatus.addEventListener("click", () => {
    let collapsed = ui.errorPane.classList.toggle("collapsed");
    errorPaneToggleButton.textContent = collapsed ? "+" : "–";
    errorPaneResizeHandle.handleElt.classList.toggle("disabled", collapsed);
  });
}

// Network callbacks
let onEditCommands: any = {};
function onConnected() {
  data = {}
  data.projectClient = new SupClient.ProjectClient(socket, { subEntries: false });

  let modelActor = new SupEngine.Actor(ui.gameInstance, "Model");
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

// User interface
function onModelFileSelectChange(event: any) {
  if (event.target.files.length === 0) return;

  ui.errorsTBody.innerHTML = "";

  importModel(event.target.files, (log, data) => {
    event.target.parentElement.reset();

    let errorsCount = 0;
    let warningsCount = 0;
    let lastErrorRow: HTMLTableRowElement = null;

    if (log == null) log = [];
    for (let entry of log) {
      // console.log(entry.file, entry.line, entry.type, entry.message);

      let logRow = document.createElement("tr");

      let positionCell = document.createElement("td");
      positionCell.textContent = (entry.line != null) ? (entry.line + 1).toString() : "";
      logRow.appendChild(positionCell);

      let typeCell = document.createElement("td");
      typeCell.textContent = entry.type;
      logRow.appendChild(typeCell);

      let messageCell = document.createElement("td");
      messageCell.textContent = entry.message;
      logRow.appendChild(messageCell);

      let fileCell = document.createElement("td");
      fileCell.textContent = entry.file;
      logRow.appendChild(fileCell);

      if (entry.type == "warning") warningsCount++;

      if (entry.type !== "error") {
        ui.errorsTBody.appendChild(logRow);
        continue;
      }

      ui.errorsTBody.insertBefore(logRow, (lastErrorRow != null) ? lastErrorRow.nextElementSibling : ui.errorsTBody.firstChild);
      lastErrorRow = logRow;
      errorsCount++;
    }

    let errorsAndWarningsInfo: string[] = [];
    if (errorsCount > 1) errorsAndWarningsInfo.push(`${errorsCount} errors`);
    else if (errorsCount > 0) errorsAndWarningsInfo.push(`1 error`);
    else errorsAndWarningsInfo.push("No errors");

    if (warningsCount > 1) errorsAndWarningsInfo.push(`${warningsCount} warnings`);
    else if (warningsCount > 0) errorsAndWarningsInfo.push(`${warningsCount} warnings`);

    if (data == null || errorsCount > 0) {
      let info = (data == null) ? `Import failed — ` : "";
      ui.errorPaneInfo.textContent = info + errorsAndWarningsInfo.join(", ");
      ui.errorPaneStatus.classList.add("has-errors");
      return;
    }

    ui.errorPaneInfo.textContent = errorsAndWarningsInfo.join(", ");
    ui.errorPaneStatus.classList.remove("has-errors");

    socket.emit("edit:assets", info.assetId, "setModel", data.upAxisMatrix, data.attributes, data.bones, (err: string) => {
      if (err != null) { alert(err); return; }
    });

    if (data.maps != null) {
      socket.emit("edit:assets", info.assetId, "setMaps", data.maps, (err: string) => {
        if (err != null) { alert(err); return; }
      });
    }
  });
}

function onPrimaryMapFileSelectChange(event: Event) {
  ui.errorsTBody.innerHTML = "";
  ui.errorPaneInfo.textContent = "No errors";
  ui.errorPaneStatus.classList.remove("has-errors");

  let reader = new FileReader;
  reader.onload = (event) => {



    socket.emit("edit:assets", info.assetId, "setMaps", { map: reader.result }, (err: string) => {
      if (err != null) { alert(err); return; }
    });
  };

  let element = <HTMLInputElement>event.target;
  reader.readAsArrayBuffer(element.files[0]);
  (<HTMLFormElement>element.parentElement).reset();
  return
}

function onShowSkeletonChange(event: Event) {
  data.modelUpdater.modelRenderer.setShowSkeleton((<HTMLInputElement>event.target).checked);
}

function onCheckOpacity(event: any) {
  let opacity = (event.target.checked) ? 1 : null;
  socket.emit("edit:assets", info.assetId, "setProperty", "opacity", opacity, (err: string) => {
    if (err != null) alert(err);
  });
}

function onChangeOpacity(event: any) {
  socket.emit("edit:assets", info.assetId, "setProperty", "opacity", parseFloat(event.target.value), (err: string) => {
    if (err != null) alert(err);
  });
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

  importModel(event.target.files, (log, data) => {
    event.target.parentElement.reset();

    for(let entry in log) {
      console.log(entry.file, entry.line, entry.type, entry.message);
    }

    if (data == null) { alert("Import failed. See console for details."); return; }
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
  for (let animation of orderedNodes) animationIds.push((<any>animation.dataset).id);

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
  (<any>liElt.dataset).id = animation.id;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = animation.name;
  liElt.appendChild(nameSpan);

  ui.animationsTreeView.insertAt(liElt, "item", index, null);
}

// Engine
let lastTimestamp = 0;
let accumulatedTime = 0;
function tick(timestamp=0) {
  accumulatedTime += timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  let { updates, timeLeft } = ui.gameInstance.tick(accumulatedTime);
  accumulatedTime = timeLeft;

  if (updates > 0) ui.gameInstance.draw();
  ui.tickAnimationFrameId = requestAnimationFrame(tick);
}

// Start
start();
