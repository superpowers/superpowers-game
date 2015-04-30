let TreeView = require("dnd-tree-view");
import * as async from "async"
let THREE = SupEngine.THREE;

import SceneAsset, { DuplicatedNode } from "../../data/SceneAsset";
import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";
import TransformMarker from "./TransformMarker";

let qs = require("querystring").parse(window.location.search.slice(1));
let info = { projectId: qs.project, assetId: qs.asset };
let data: { projectClient: SupClient.ProjectClient, asset?: SceneAsset };
let ui: any = { componentEditors: {} };
let socket: SocketIOClient.Socket;

function start() {
  socket = SupClient.connect(info.projectId);
  socket.on("connect", onConnected);
  socket.on("disconnect", SupClient.onDisconnected);
  SupClient.setupHotkeys();

  // Setup tree view
  ui.nodesTreeView = new TreeView(document.querySelector(".nodes-tree-view"), onNodeDrop);
  ui.nodesTreeView.on("activate", onNodeActivate);
  ui.nodesTreeView.on("selectionChange", onNodeSelect);

  document.querySelector("button.new-node").addEventListener("click", onNewNodeClick);
  document.querySelector("button.rename-node").addEventListener("click", onRenameNodeClick);
  document.querySelector("button.duplicate-node").addEventListener("click", onDuplicateNodeClick);
  document.querySelector("button.delete-node").addEventListener("click", onDeleteNodeClick);

  // Inspector
  ui.inspectorElt = document.querySelector(".inspector");

  ui.transform = {
    positionElts: ui.inspectorElt.querySelectorAll(".transform .position input"),
    orientationElts: ui.inspectorElt.querySelectorAll(".transform .orientation input"),
    scaleElts: ui.inspectorElt.querySelectorAll(".transform .scale input"),
  };

  for (let transformType in ui.transform) {
    let inputs = ui.transform[transformType];
    for (let input of inputs) input.addEventListener("change", onTransformInputChange);
  }

  ui.componentEditorClasses = {};
  for (let componentName in SupEngine.componentEditorClasses) ui.componentEditorClasses[componentName] = componentName;

  document.querySelector("button.new-component").addEventListener("click", onNewComponentClick);

  // Setup 3D viewport
  let canvasElt = <HTMLCanvasElement>document.querySelector("canvas");

  ui.gameInstance = new SupEngine.GameInstance(canvasElt);
  ui.cameraActor = new SupEngine.Actor(ui.gameInstance, "Camera");
  ui.cameraActor.setLocalPosition(new THREE.Vector3(0, 0, 10));
  ui.cameraMode = "3D"
  ui.cameraComponent = new SupEngine.componentClasses["Camera"](ui.cameraActor);
  ui.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](ui.cameraActor, ui.cameraComponent);
  ui.cameraModeButton = document.querySelector("button#toggle-camera-button")
  ui.cameraModeButton.addEventListener("click", onChangeCameraMode);

  ui.bySceneNodeId = {}

  ui.tickAnimationFrameId = requestAnimationFrame(tick);
}

// Network callbacks
function onConnected() {
  data = { projectClient: new SupClient.ProjectClient(socket, { subEntries: true }) };
  data.projectClient.subAsset(info.assetId, "scene", sceneSubscriber);
}

var sceneSubscriber = {
  onAssetReceived: (err: string, asset: SceneAsset) => {
    data.asset = asset;

    // Clear tree view
    ui.nodesTreeView.clearSelection()
    ui.nodesTreeView.treeRoot.innerHTML = ""

    // TODO: Clear existing actors

    function walk(node: Node, parentNode: Node, parentElt: HTMLLIElement) {
      let liElt = createNodeElement(node);
      ui.nodesTreeView.append(liElt, "group", parentElt);

      createNodeActor(node);

      if (node.children != null && node.children.length > 0) {
        liElt.classList.add("collapsed");
        for (let child of node.children) walk(child, node, liElt)
      }
    }
    for (let node of data.asset.nodes.pub) walk(node, null, null);
  },

  onAssetEdited: (id: string, command: string, ...args: any[]) => {
    if (onEditCommands[command] != null) onEditCommands[command].apply(data.asset, args);
  },

  onAssetTrashed: (id: string) => { SupClient.onAssetTrashed(); }
}
var onEditCommands: any = {};
onEditCommands.addNode = (node: Node, parentId: string, index: number) => {
  let nodeElt = createNodeElement(node);
  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);

  createNodeActor(node);
}

onEditCommands.moveNode = (id: string, parentId: string, index: number) => {
  // Reparent tree node
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length == 1 && nodeElt == ui.nodesTreeView.selectedNodes[0];

  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`)
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);

  // Update actor
  let nodeActor = ui.bySceneNodeId[id].actor;
  let parentNodeActor = (ui.bySceneNodeId[parentId] != null) ? ui.bySceneNodeId[parentId].actor : null;
  nodeActor.setParent(parentNodeActor);

  // Update data.asset.nodes with new local transform
  let node = data.asset.nodes.byId[id]
  node.position = {
    x: nodeActor.threeObject.position.x,
    y: nodeActor.threeObject.position.y,
    z: nodeActor.threeObject.position.z,
  };

  node.orientation = {
    x: nodeActor.threeObject.quaternion.x,
    y: nodeActor.threeObject.quaternion.y,
    z: nodeActor.threeObject.quaternion.z,
    w: nodeActor.threeObject.quaternion.w,
  };

  node.scale = {
    x: nodeActor.threeObject.scale.x,
    y: nodeActor.threeObject.scale.y,
    z: nodeActor.threeObject.scale.z,
  };

  // Refresh inspector
  if (isInspected) {
    setInspectorPosition(<THREE.Vector3>node.position);
    setInspectorOrientation(<THREE.Quaternion>node.orientation);
    setInspectorScale(<THREE.Vector3>node.scale);
  }
}

onEditCommands.setNodeProperty = (id: string, path: string, value: any) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length == 1 && nodeElt == ui.nodesTreeView.selectedNodes[0];

  switch (path) {
    case "name": { nodeElt.querySelector(".name").textContent = value; break; }
    case "position": {
      if (isInspected) setInspectorPosition(<THREE.Vector3>data.asset.nodes.byId[id].position);
      ui.bySceneNodeId[id].actor.setLocalPosition(value);
      break;
    }
    case "orientation": {
      if (isInspected) setInspectorOrientation(<THREE.Quaternion>data.asset.nodes.byId[id].orientation);
      ui.bySceneNodeId[id].actor.setLocalOrientation(value);
      break;
    }
    case "scale": {
      if (isInspected) setInspectorScale(<THREE.Vector3>data.asset.nodes.byId[id].scale);
      ui.bySceneNodeId[id].actor.setLocalScale(value);
      break;
    }
  }
}

onEditCommands.duplicateNode = (rootNode: Node, newNodes: DuplicatedNode[]) => {
  for (let newNode of newNodes) onEditCommands.addNode(newNode.node, newNode.parentId, newNode.index);
}

onEditCommands.removeNode = (id: string) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length == 1 && nodeElt == ui.nodesTreeView.selectedNodes[0];

  ui.nodesTreeView.remove(nodeElt);
  if (isInspected) onNodeSelect();

  let actorToBeDestroyed = ui.bySceneNodeId[id].actor;
  recurseClearActorUIs(id);
  ui.gameInstance.destroyActor(actorToBeDestroyed);
}

function recurseClearActorUIs(nodeId: string) {
  let actor = ui.bySceneNodeId[nodeId].actor;

  for (let childActor of actor.children) {
  	if (childActor.sceneNodeId != null) recurseClearActorUIs(childActor.sceneNodeId);
  }

  for (let componentId of ui.bySceneNodeId[nodeId].bySceneComponentId) {
    ui.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater.destroy();
  }

  delete ui.bySceneNodeId[nodeId];
}

onEditCommands.addComponent = (nodeId: string, nodeComponent: Component, index: number) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length == 1 && nodeId == ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (isInspected) {
    let componentElt = createComponentElement(nodeId, nodeComponent);
    // TODO: Take index into account
    ui.inspectorElt.querySelector(".components").appendChild(componentElt);
  }

  createNodeActorComponent(data.asset.nodes.byId[nodeId], nodeComponent, ui.bySceneNodeId[nodeId].actor);
}

onEditCommands.editComponent = (nodeId: string, componentId: string, command: string, ...args: any[]) => {
  let componentUpdater = ui.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater;
  if (componentUpdater[`config_${command}`] != null) componentUpdater[`config_${command}`].call(componentUpdater, ...args);

  let isInspected = ui.nodesTreeView.selectedNodes.length == 1 && nodeId == ui.nodesTreeView.selectedNodes[0].dataset.id;
  if (isInspected) {
    let componentEditor = ui.componentEditors[componentId];
    if (componentEditor[`config_${command}`] != null) componentEditor[`config_${command}`].call(componentEditor, ...args);
  }
}

onEditCommands.removeComponent = (nodeId: string, componentId: string) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length == 1 && nodeId == ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (isInspected) {
    ui.componentEditors[componentId].destroy();
    delete ui.componentEditors[componentId];

    let componentElt = ui.inspectorElt.querySelector(`.components > div[data-component-id='${componentId}']`);
    componentElt.parentElement.removeChild(componentElt);
  }

  ui.gameInstance.destroyComponent(ui.bySceneNodeId[nodeId].bySceneComponentId[componentId].component);

  ui.bySceneNodeId[nodeId].bySceneComponentId[componentId].componentUpdater.destroy();
  delete ui.bySceneNodeId[nodeId].bySceneComponentId[componentId];
}

// User interface
function createNodeElement(node: Node) {
  let liElt = document.createElement("li");
  liElt.dataset["id"] = node.id;

  let nameSpan = document.createElement("span");
  nameSpan.className = "name";
  nameSpan.textContent = node.name;
  liElt.appendChild(nameSpan);

  return liElt;
}

function onNodeDrop(dropInfo: any, orderedNodes: any) {
  let dropPoint = SupClient.getTreeViewDropPoint(dropInfo, data.asset.nodes);

  let nodeIds: string[] = []
  for (let node of orderedNodes ) nodeIds.push(node.dataset.id);

  let sourceParentNode = data.asset.nodes.parentNodesById[nodeIds[0]];
  let sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : data.asset.nodes.pub;
  let sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (let id of nodeIds) {
    socket.emit("edit:assets", info.assetId, "moveNode", id, dropPoint.parentId, dropPoint.index + i, (err: string) => { if (err != null) alert(err); });
    if (! sameParent || sourceChildren.indexOf(data.asset.nodes.byId[id]) >= dropPoint.index) i++;
  }
  return false
}

function onNodeActivate() { ui.nodesTreeView.selectedNodes[0].classList.toggle("collapsed"); }

function onNodeSelect() {
  // Clear component editors
  for (let componentId in ui.componentEditors) ui.componentEditors[componentId].destroy();
  ui.componentEditors = {};

  // Setup transform
  let nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt == null || ui.nodesTreeView.selectedNodes.length !== 1) {
    ui.inspectorElt.classList.add("noSelection");
    return;
  }

  ui.inspectorElt.classList.remove("noSelection");

  let node = data.asset.nodes.byId[nodeElt.dataset.id];
  setInspectorPosition(<THREE.Vector3>node.position);
  setInspectorOrientation(<THREE.Quaternion>node.orientation);
  setInspectorScale(<THREE.Vector3>node.scale);

  // Setup component editors
  let componentsElt = ui.inspectorElt.querySelector(".components");
  componentsElt.innerHTML = "";

  for (let component of node.components) {
    let componentElt = createComponentElement(node.id, component);
    ui.inspectorElt.querySelector(".components").appendChild(componentElt);
  }
}

function roundForInspector(number: number) { return parseFloat(number.toFixed(3)); }

function setInspectorPosition(position: THREE.Vector3) {
  ui.transform.positionElts[0].value = roundForInspector(position.x);
  ui.transform.positionElts[1].value = roundForInspector(position.y);
  ui.transform.positionElts[2].value = roundForInspector(position.z);
}

function setInspectorOrientation(orientation: THREE.Quaternion) {
  let euler = new THREE.Euler().setFromQuaternion(orientation)
  ui.transform.orientationElts[0].value = roundForInspector(THREE.Math.radToDeg(euler.x));
  ui.transform.orientationElts[1].value = roundForInspector(THREE.Math.radToDeg(euler.y));
  ui.transform.orientationElts[2].value = roundForInspector(THREE.Math.radToDeg(euler.z));
}

function setInspectorScale(scale: THREE.Vector3) {
  ui.transform.scaleElts[0].value = roundForInspector(scale.x);
  ui.transform.scaleElts[1].value = roundForInspector(scale.y);
  ui.transform.scaleElts[2].value = roundForInspector(scale.z);
}

function onNewNodeClick() {
  SupClient.dialogs.prompt("Enter a name for the actor.", null, "Actor", "Create", (name) => {
    if (name == null) return;

    let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    let offset = new THREE.Vector3(0, 0, -5).applyQuaternion(ui.cameraActor.getGlobalOrientation());
    let position = ui.cameraActor.getGlobalPosition().add(offset);
    if (options.parentId != null) {
      let parentMatrix = ui.bySceneNodeId[options.parentId].actor.getGlobalMatrix();
      position.applyMatrix4(parentMatrix.getInverse(parentMatrix));
    }
    (<any>options).transform = { position };

    socket.emit("edit:assets", info.assetId, "addNode", name, options, (err: string, nodeId: string) => {
      if (err != null) { alert(err); return; }

      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`));
      onNodeSelect();
    });
  });
}

function onRenameNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.asset.nodes.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a new name for the actor.", null, node.name, "Rename", (newName) => {
    if (newName == null) return;

    socket.emit("edit:assets", info.assetId, "setNodeProperty", node.id, "name", newName, (err: string) => { if (err != null) alert(err); });
  });
}

function onDuplicateNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let selectedNode = ui.nodesTreeView.selectedNodes[0];
  let node = data.asset.nodes.byId[selectedNode.dataset.id];

  SupClient.dialogs.prompt("Enter a name for the new actor.", null, node.name, "Duplicate", (newName) => {
    if (newName == null) return;
    let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    socket.emit("edit:assets", info.assetId, "duplicateNode", newName, node.id, options.index, (err: string, nodeId: string) => {
      if (err != null) alert(err);

      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`));
      onNodeSelect();
    });
  });
}

function onDeleteNodeClick() {
  if (ui.nodesTreeView.selectedNodes.length === 0) return;
  SupClient.dialogs.confirm("Are you sure you want to delete the selected actors?", "Delete", (confirm) => {
    if (! confirm) return;

    for (let selectedNode of ui.nodesTreeView.selectedNodes) {
      socket.emit("edit:assets", info.assetId, "removeNode", selectedNode.dataset.id, (err: string) => { if (err != null) alert(err); });
    }
  });
}

function onTransformInputChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let transformType = event.target.parentElement.parentElement.parentElement.className;
  let inputs = ui.transform[`${transformType}Elts`];

  let value = {
    x: parseFloat(inputs[0].value),
    y: parseFloat(inputs[1].value),
    z: parseFloat(inputs[2].value),
  };

  if (transformType === "orientation") {
    let euler = new THREE.Euler(THREE.Math.degToRad(value.x), THREE.Math.degToRad(value.y), THREE.Math.degToRad(value.z));
    let quaternion = new THREE.Quaternion().setFromEuler(euler);
    value = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w }
  }
  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

  socket.emit("edit:assets", info.assetId, "setNodeProperty", nodeId, transformType, value, (err: string) => { if (err != null) alert(err); });
}

function createComponentElement(nodeId: string, component: Component) {
  let componentElt = document.createElement("div");
  componentElt.dataset["componentId"] = component.id;

  let template = <any>document.getElementById("component-cartridge-template");
  let clone = <any>document.importNode(template.content, true);;

  clone.querySelector(".type").textContent = component.type;
  let table = clone.querySelector(".settings");

  let editConfig = (command: string, ...args: any[]) => {
    let callback = (err: string) => { if (err != null) alert(err); }
    // Override callback if one is given
    let lastArg = args[args.length-1];
    if (typeof lastArg === "function") callback = args.pop();

    socket.emit("edit:assets", info.assetId, "editComponent", nodeId, component.id, command, ...args, callback);
  }
  let componentEditorPlugin = SupEngine.componentEditorClasses[component.type];
  ui.componentEditors[component.id] = new componentEditorPlugin(table.querySelector("tbody"), component.config, data.projectClient, editConfig);

  let shrinkButton = clone.querySelector(".shrink-component");
  shrinkButton.addEventListener("click", () => {
    if (table.style.display === "none") {
      table.style.display = "";
      shrinkButton.textContent = "–";
    } else {
      table.style.display = "none";
      shrinkButton.textContent = "+";
    }
  });

  clone.querySelector(".delete-component").addEventListener("click", onDeleteComponentClick);

  componentElt.appendChild(clone);
  return componentElt;
}

function onNewComponentClick() {
  SupClient.dialogs.select("Select the type of component to create.", ui.componentEditorClasses, "Create", (type) => {
    if (type == null) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

    socket.emit("edit:assets", info.assetId, "addComponent", nodeId, type, null, (err: string) => { if (err != null) alert(err); });
  });
}

function onDeleteComponentClick(event: any) {
  SupClient.dialogs.confirm("Are you sure you want to delete this component?", "Delete", (confirm) => {
    if (! confirm) return;

    let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;
    let componentId = event.target.parentElement.parentElement.dataset.componentId;

    socket.emit("edit:assets", info.assetId, "removeComponent", nodeId, componentId, (err: string) => { if (err != null) alert(err); });
  });
}

function onChangeCameraMode(event: any) {
  ui.gameInstance.destroyComponent(ui.cameraControls);

  if (ui.cameraMode === "3D") {
    ui.cameraMode = "2D"
    ui.cameraActor.setLocalOrientation(new SupEngine.THREE.Quaternion().setFromAxisAngle(new SupEngine.THREE.Vector3(0, 1, 0), 0))
    ui.cameraComponent.setOrthographicMode(true)
    ui.cameraControls = new SupEngine.editorComponentClasses["Camera2DControls"](ui.cameraActor, ui.cameraComponent, {
      zoomSpeed: 1.5,
      zoomMin: 1,
      zoomMax: 100,
    });

  } else {
    ui.cameraMode = "3D";
    ui.cameraComponent.setOrthographicMode(false);
    ui.cameraControls = new SupEngine.editorComponentClasses["Camera3DControls"](ui.cameraActor, ui.cameraComponent);
  }

  ui.cameraModeButton.textContent = ui.cameraMode;
}

// Engine
function createNodeActor(node: Node) {
  let parentNode = data.asset.nodes.parentNodesById[node.id]
  let parentActor: SupEngine.Actor;
  if (parentNode != null) parentActor = ui.bySceneNodeId[parentNode.id].actor

  let nodeActor = new SupEngine.Actor(ui.gameInstance, node.name, parentActor);
  nodeActor.threeObject.position.copy(<THREE.Vector3>node.position);
  nodeActor.threeObject.quaternion.copy(<THREE.Quaternion>node.orientation);
  nodeActor.threeObject.scale.copy(<THREE.Vector3>node.scale);
  nodeActor.threeObject.updateMatrixWorld(false);
  (<any>nodeActor).sceneNodeId = node.id;
  new TransformMarker(nodeActor);

  ui.bySceneNodeId[node.id] = { actor: nodeActor, bySceneComponentId: {} }

  for (let component of node.components) createNodeActorComponent(node, component, nodeActor);
  return nodeActor;
}

function createNodeActorComponent(sceneNode: Node, sceneComponent: Component, nodeActor: SupEngine.Actor) {
  let componentClass = SupEngine.editorComponentClasses[`${sceneComponent.type}Marker`];
  if (componentClass == null) componentClass = SupEngine.componentClasses[sceneComponent.type];
  let actorComponent = new componentClass(nodeActor);

  ui.bySceneNodeId[sceneNode.id].bySceneComponentId[sceneComponent.id] = {
    component: actorComponent,
    componentUpdater: new componentClass.Updater(data.projectClient, actorComponent, sceneComponent.config),
  }
}


function tick() {
  // FIXME: decouple update interval from render interval
  ui.gameInstance.update();
  ui.gameInstance.draw();
  ui.tickAnimationFrameId = requestAnimationFrame(tick);
}

// Load plugins
async.each(SupClient.pluginPaths.all, (pluginName, pluginCallback) => {
  if (pluginName == "sparklinlabs/scene") { pluginCallback(); return; }

  async.series([

    (cb) => {
      let dataScript = document.createElement("script");
      dataScript.src = `/plugins/${pluginName}/data.js`;
      dataScript.addEventListener("load", () => { cb(null, null); } );
      dataScript.addEventListener("error", () => { cb(null, null); } );
      document.body.appendChild(dataScript);
    },

    (cb) => {
      let componentsScript = document.createElement("script");
      componentsScript.src = `/plugins/${pluginName}/components.js`;
      componentsScript.addEventListener("load", () => { cb(null, null); } );
      componentsScript.addEventListener("error", () => { cb(null, null); } );
      document.body.appendChild(componentsScript);
    },

    (cb) => {
      let componentEditorsScript = document.createElement("script");
      componentEditorsScript.src = `/plugins/${pluginName}/componentEditors.js`;
      componentEditorsScript.addEventListener("load", () => { cb(null, null); } );
      componentEditorsScript.addEventListener("error", () => { cb(null, null); } );
      document.body.appendChild(componentEditorsScript);
    },

  ], pluginCallback);
}, (err) => {
  // Start
  start()
});
