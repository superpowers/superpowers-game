import info from "./info";
import ui, { createNodeElement } from "./ui";
import engine from "./engine";

import CubicModelRenderer from "../../components/CubicModelRenderer";
import CubicModelRendererUpdater from "../../components/CubicModelRendererUpdater";
import { Node } from "../../data/CubicModelNodes";

export let data: { projectClient?: SupClient.ProjectClient; cubicModelUpdater?: CubicModelRendererUpdater };

export let socket = SupClient.connect(info.projectId);
socket.on("connect", onConnected);
socket.on("disconnect", SupClient.onDisconnected);

let onEditCommands: any = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  let cubicModelActor = new SupEngine.Actor(engine.gameInstance, "Cubic Model");
  let cubicModelRenderer = new CubicModelRenderer(cubicModelActor);
  let config = { cubicModelAssetId: info.assetId/*, materialType: "basic"*/ };
  let receiveCallbacks = { cubicModel: onAssetReceived };
  let editCallbacks = { cubicModel: onEditCommands };

  data.cubicModelUpdater = new CubicModelRendererUpdater(data.projectClient, cubicModelRenderer, config, receiveCallbacks, editCallbacks);
}

function onAssetReceived() {
  // Clear tree view
  ui.nodesTreeView.clearSelection();
  ui.nodesTreeView.treeRoot.innerHTML = "";

  function walk(node: Node, parentNode: Node, parentElt: HTMLLIElement) {
    let liElt = createNodeElement(node);
    ui.nodesTreeView.append(liElt, "group", parentElt);

    if (node.children != null && node.children.length > 0) {
      liElt.classList.add("collapsed");
      for (let child of node.children) walk(child, node, liElt)
    }
  }
  for (let node of data.cubicModelUpdater.cubicModelAsset.nodes.pub) walk(node, null, null);
}
