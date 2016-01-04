import ui, {
  start as uiStart,
  setCameraMode, setCameraVerticalAxis, createNodeElement, setupSelectedNode, createComponentElement,
  setInspectorPosition, setInspectorOrientation, setInspectorScale,
  setInspectorVisible, setInspectorLayer, setInspectorPrefabScene,
  setupInspectorLayers } from "./ui";
import engine, { start as engineStart, setupHelpers } from "./engine";
import * as async from "async";

let THREE = SupEngine.THREE;
import { DuplicatedNode } from "../../data/SceneAsset";
import SceneSettingsResource from "../../data/SceneSettingsResource";
import { Node } from "../../data/SceneNodes";
import { Component } from "../../data/SceneComponents";
import SceneUpdater from "../../components/SceneUpdater";

export let data: {
  projectClient: SupClient.ProjectClient;
  sceneUpdater?: SceneUpdater;
  gameSettingsResource?: any;
};

export let socket: SocketIOClient.Socket;

socket = SupClient.connect(SupClient.query.project);
socket.on("welcome", onWelcome);
socket.on("disconnect", SupClient.onDisconnected);

function onWelcome() {
  data = { projectClient: new SupClient.ProjectClient(socket, { subEntries: true }) };

  loadPlugins((err, locales) => {
    SupClient.i18n.load(locales, () => {
      engineStart();
      uiStart();

      data.projectClient.subResource("sceneSettings", sceneSettingSubscriber);
      data.projectClient.subResource("gameSettings", gameSettingSubscriber);
    });
  });
}

function loadPlugins(callback: (err: Error, locales: SupClient.i18n.File[]) => void) {
  let locales: SupClient.i18n.File[] = [];
  locales.push({ root: `${window.location.pathname}/../..`, name: "sceneEditor" });

  SupClient.fetch(`/systems/${SupCore.system.name}/plugins.json`, "json", (err: Error, pluginsInfo: SupCore.PluginsInfo) => {
    async.eachSeries(pluginsInfo.list, (pluginName, pluginCallback) => {
      async.series([

        (cb) => {
          let dataScript = document.createElement("script");
          dataScript.src = `/systems/${SupCore.system.name}/plugins/${pluginName}/data.js`;
          dataScript.addEventListener("load", () => { cb(null, null); } );
          dataScript.addEventListener("error", () => { cb(null, null); } );
          document.body.appendChild(dataScript);
        },

        (cb) => {
          let componentsScript = document.createElement("script");
          componentsScript.src = `/systems/${SupCore.system.name}/plugins/${pluginName}/components.js`;
          componentsScript.addEventListener("load", () => { cb(null, null); } );
          componentsScript.addEventListener("error", () => { cb(null, null); } );
          document.body.appendChild(componentsScript);
        },

        (cb) => {
          let componentConfigsScript = document.createElement("script");
          componentConfigsScript.src = `/systems/${SupCore.system.name}/plugins/${pluginName}/componentConfigs.js`;
          componentConfigsScript.addEventListener("load", () => { cb(null, null); } );
          componentConfigsScript.addEventListener("error", () => { cb(null, null); } );
          document.body.appendChild(componentConfigsScript);
        },

        (cb) => {
          SupClient.activePluginPath = `/systems/${SupCore.system.name}/plugins/${pluginName}`;
          let componentEditorsScript = document.createElement("script");
          componentEditorsScript.src = `${SupClient.activePluginPath}/componentEditors.js`;
          componentEditorsScript.addEventListener("load", () => {

            locales.push({ root: SupClient.activePluginPath, name: "componentEditors" });
            cb(null, null);
          } );
          componentEditorsScript.addEventListener("error", () => { cb(null, null); } );
          document.body.appendChild(componentEditorsScript);
        },

      ], pluginCallback);
    }, (err) => { callback(err, locales); });
  });
}

var sceneSettingSubscriber = {
  onResourceReceived: (resourceId: string, resource: SceneSettingsResource) => {
    setCameraMode(resource.pub.defaultCameraMode);
    setCameraVerticalAxis(resource.pub.defaultVerticalAxis);

    data.sceneUpdater = new SceneUpdater(
      data.projectClient,
      { gameInstance: engine.gameInstance, actor: null },
      { sceneAssetId: SupClient.query.asset, isInPrefab: false },
      { scene: onSceneAssetReceived },
      { scene: onEditCommands }
    );
  },

  onResourceEdited: (resourceId: string, command: string, propertyName: string) => {}
};

var gameSettingSubscriber = {
  onResourceReceived: (resourceId: string, resource: any) => {
    data.gameSettingsResource = resource;
    setupInspectorLayers();
  },

  onResourceEdited: (resourceId: string, command: string, propertyName: string) => {
    if (propertyName === "customLayers") setupInspectorLayers();
  }
};


function onSceneAssetReceived(/*err: string, asset: SceneAsset*/) {
  // Clear tree view
  ui.nodesTreeView.clearSelection();
  ui.nodesTreeView.treeRoot.innerHTML = "";

  let box = {
    x: { min: Infinity, max: -Infinity },
    y: { min: Infinity, max: -Infinity },
    z: { min: Infinity, max: -Infinity },
  };

  let pos = new THREE.Vector3();
  function walk(node: Node, parentNode: Node, parentElt: HTMLLIElement) {
    let liElt = createNodeElement(node);
    ui.nodesTreeView.append(liElt, "group", parentElt);

    if (node.children != null && node.children.length > 0) {
      liElt.classList.add("collapsed");
      for (let child of node.children) walk(child, node, liElt);
    }

    // Compute scene bounding box
    data.sceneUpdater.bySceneNodeId[node.id].actor.getGlobalPosition(pos);

    box.x.min = Math.min(box.x.min, pos.x);
    box.x.max = Math.max(box.x.max, pos.x);

    box.y.min = Math.min(box.y.min, pos.y);
    box.y.max = Math.max(box.y.max, pos.y);

    box.z.min = Math.min(box.z.min, pos.z);
    box.z.max = Math.max(box.z.max, pos.z);
  }
  for (let node of data.sceneUpdater.sceneAsset.nodes.pub) walk(node, null, null);

  // Place camera so that it fits the scene
  if (data.sceneUpdater.sceneAsset.nodes.pub.length > 0) {
    let z = box.z.max + 10;
    engine.cameraActor.setLocalPosition(new THREE.Vector3((box.x.min + box.x.max) / 2, (box.y.min + box.y.max) / 2, z));
    ui.camera2DZ.value = z.toString();
  }
}

var onEditCommands: any = {};
onEditCommands.addNode = (node: Node, parentId: string, index: number) => {
  let nodeElt = createNodeElement(node);
  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);
};

onEditCommands.moveNode = (id: string, parentId: string, index: number) => {
  // Reparent tree node
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];

  let parentElt: HTMLLIElement;
  if (parentId != null) parentElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${parentId}']`);
  ui.nodesTreeView.insertAt(nodeElt, "group", index, parentElt);

  // Refresh inspector
  if (isInspected) {
    let node = data.sceneUpdater.sceneAsset.nodes.byId[id];
    setInspectorPosition(<THREE.Vector3>node.position);
    setInspectorOrientation(<THREE.Quaternion>node.orientation);
    setInspectorScale(<THREE.Vector3>node.scale);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.setNodeProperty = (id: string, path: string, value: any) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];
  let node = data.sceneUpdater.sceneAsset.nodes.byId[id];

  switch (path) {
    case "name":
      nodeElt.querySelector(".name").textContent = value;
      break;
    case "position":
      if (isInspected) setInspectorPosition(<THREE.Vector3>node.position);
      break;
    case "orientation":
      if (isInspected) setInspectorOrientation(<THREE.Quaternion>node.orientation);
      break;
    case "scale":
      if (isInspected) setInspectorScale(<THREE.Vector3>node.scale);
      break;
    case "visible":
      if (isInspected) setInspectorVisible(value);
      break;
    case "layer":
      if (isInspected) setInspectorLayer(value);
      break;
    case "prefab.sceneAssetId":
      if (isInspected) setInspectorPrefabScene(value);
      break;
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.duplicateNode = (rootNode: Node, newNodes: DuplicatedNode[]) => {
  for (let newNode of newNodes) onEditCommands.addNode(newNode.node, newNode.parentId, newNode.index);

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.removeNode = (id: string) => {
  let nodeElt = ui.nodesTreeView.treeRoot.querySelector(`[data-id='${id}']`);
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeElt === ui.nodesTreeView.selectedNodes[0];

  ui.nodesTreeView.remove(nodeElt);
  if (isInspected) setupSelectedNode();
  // TODO: Only refresh if selection is affected
  else setupHelpers();
};

onEditCommands.addComponent = (nodeId: string, nodeComponent: Component, index: number) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (isInspected) {
    let componentElt = createComponentElement(nodeId, nodeComponent);
    // TODO: Take index into account
    ui.inspectorElt.querySelector(".components").appendChild(componentElt);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.editComponent = (nodeId: string, componentId: string, command: string, ...args: any[]) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;
  if (isInspected) {
    let componentEditor = ui.componentEditors[componentId];
    let commandCallback = (<any>componentEditor)[`config_${command}`];
    if (commandCallback != null) commandCallback.call(componentEditor, ...args);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
};

onEditCommands.removeComponent = (nodeId: string, componentId: string) => {
  let isInspected = ui.nodesTreeView.selectedNodes.length === 1 && nodeId === ui.nodesTreeView.selectedNodes[0].dataset.id;

  if (isInspected) {
    ui.componentEditors[componentId].destroy();
    delete ui.componentEditors[componentId];

    let componentElt = <HTMLDivElement>ui.inspectorElt.querySelector(`.components > div[data-component-id='${componentId}']`);
    componentElt.parentElement.removeChild(componentElt);
  }

  // TODO: Only refresh if selection is affected
  setupHelpers();
};
