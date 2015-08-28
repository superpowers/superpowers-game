import info from "./info";
import { socket, data } from "./network";
import engine/*, { setupHelpers }*/ from "./engine";

import { Node } from "../../data/CubicModelNodes";

let THREE = SupEngine.THREE;
let PerfectResize = require("perfect-resize");
let TreeView = require("dnd-tree-view");

SupClient.setupHotkeys();

let ui: {
  nodesTreeView?: any;

  newNodeButton?: HTMLButtonElement;
  renameNodeButton?: HTMLButtonElement;
  duplicateNodeButton?: HTMLButtonElement;
  deleteNodeButton?: HTMLButtonElement;

  inspectorElt?: HTMLDivElement;

  transform?: {
    positionElts: HTMLInputElement[];
    orientationElts: HTMLInputElement[];
  };

  shape?: {
    typeElt: HTMLSelectElement;
    offsetElts: HTMLInputElement[];

    box: {
      tbodyElt: HTMLTableSectionElement;
      sizeElts: HTMLInputElement[];
      stretchElts: HTMLInputElement[];
    }
  }
} = {};
export default ui;

// Setup resizable panes
new PerfectResize(document.querySelector(".sidebar"), "right");
new PerfectResize(document.querySelector(".nodes-tree-view"), "top");

// Setup tree view
ui.nodesTreeView = new TreeView(document.querySelector(".nodes-tree-view"), onNodeDrop);
//ui.nodesTreeView.on("activate", onNodeActivate);
ui.nodesTreeView.on("selectionChange", () => { setupSelectedNode(); });

export function createNodeElement(node: Node) {
  let liElt = document.createElement("li");
  (<any>liElt.dataset).id = node.id;

  let nameSpan = document.createElement("span");
  nameSpan.classList.add("name");
  nameSpan.textContent = node.name;
  liElt.appendChild(nameSpan);

  /*let visibleButton = document.createElement("button");
  visibleButton.textContent = "Hide";
  visibleButton.classList.add("show");
  visibleButton.addEventListener("click", (event: any) => {
    event.stopPropagation();
    let actor = data.cubicModelUpdater.byCubicModelNodeId[event.target.parentElement.dataset["id"]].actor;
    actor.threeObject.visible = !actor.threeObject.visible;
    visibleButton.textContent = (actor.threeObject.visible) ? "Hide" : "Show";
    if (actor.threeObject.visible) visibleButton.classList.add("show");
    else visibleButton.classList.remove("show");
  });
  liElt.appendChild(visibleButton);*/

  return liElt;
}

function onNodeDrop(dropInfo: any, orderedNodes: any) {
  /*
  let dropPoint = SupClient.getTreeViewDropPoint(dropInfo, data.cubicModelUpdater.cubicModelAsset.nodes);

  let nodeIds: string[] = [];
  for (let node of orderedNodes ) nodeIds.push(node.dataset.id);

  let sourceParentNode = data.cubicModelUpdater.cubicModelAsset.nodes.parentNodesById[nodeIds[0]];
  let sourceChildren = (sourceParentNode != null && sourceParentNode.children != null) ? sourceParentNode.children : data.cubicModelUpdater.cubicModelAsset.nodes.pub;
  let sameParent = (sourceParentNode != null && dropPoint.parentId === sourceParentNode.id);

  let i = 0;
  for (let id of nodeIds) {
    socket.emit("edit:assets", info.assetId, "moveNode", id, dropPoint.parentId, dropPoint.index + i, (err: string) => { if (err != null) alert(err); });
    if (! sameParent || sourceChildren.indexOf(data.cubicModelUpdater.cubicModelAsset.nodes.byId[id]) >= dropPoint.index) i++;
  }
  return false;
  */
}

export function setupSelectedNode() {
  //setupHelpers();

  // Setup transform
  let nodeElt = ui.nodesTreeView.selectedNodes[0];
  if (nodeElt == null || ui.nodesTreeView.selectedNodes.length !== 1) {
    ui.inspectorElt.hidden = true;

    ui.newNodeButton.disabled = false;
    ui.renameNodeButton.disabled = true;
    ui.duplicateNodeButton.disabled = true;
    ui.deleteNodeButton.disabled = true;
    return;
  }

  ui.inspectorElt.hidden = false;

  let node = data.cubicModelUpdater.cubicModelAsset.nodes.byId[nodeElt.dataset.id];
  setInspectorPosition(<THREE.Vector3>node.position);
  setInspectorOrientation(<THREE.Quaternion>node.orientation);

  // Setup shape editor
  ui.shape.typeElt.value = node.shape.type;

  setInspectorShapeOffset(<THREE.Vector3>node.shape.offset);

  ui.shape.box.tbodyElt.hidden = node.shape.type !== "box";
  if (!ui.shape.box.tbodyElt.hidden) {
    let boxSettings: any = node.shape.settings;

    setInspectorBoxSize(<THREE.Vector3>{
      x: boxSettings.width,
      y: boxSettings.height,
      z: boxSettings.depth
    });

    setInspectorBoxStretch(<THREE.Vector3>boxSettings.stretch);
  }
}

function roundForInspector(number: number) { return parseFloat(number.toFixed(3)); }

export function setInspectorPosition(position: THREE.Vector3) {
  let values = [
    roundForInspector(position.x).toString(),
    roundForInspector(position.y).toString(),
    roundForInspector(position.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.transform.positionElts[i].value !== values[i]) {
      ui.transform.positionElts[i].value = values[i];
    }
  }
}

export function setInspectorOrientation(orientation: THREE.Quaternion) {
  let euler = new THREE.Euler().setFromQuaternion(orientation);

  let values = [
    roundForInspector(THREE.Math.radToDeg(euler.x)).toString(),
    roundForInspector(THREE.Math.radToDeg(euler.y)).toString(),
    roundForInspector(THREE.Math.radToDeg(euler.z)).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.transform.orientationElts[i].value !== values[i]) {
      ui.transform.orientationElts[i].value = values[i];
    }
  }
}

export function setInspectorShapeOffset(offset: THREE.Vector3) {
  let values = [
    roundForInspector(offset.x).toString(),
    roundForInspector(offset.y).toString(),
    roundForInspector(offset.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.shape.offsetElts[i].value !== values[i]) {
      ui.shape.offsetElts[i].value = values[i];
    }
  }
}

export function setInspectorBoxSize(size: THREE.Vector3) {
  let values = [ size.x.toString(), size.y.toString(), size.z.toString() ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.shape.box.sizeElts[i].value !== values[i]) {
      ui.shape.box.sizeElts[i].value = values[i];
    }
  }
}

export function setInspectorBoxStretch(stretch: THREE.Vector3) {
  let values = [
    roundForInspector(stretch.x).toString(),
    roundForInspector(stretch.y).toString(),
    roundForInspector(stretch.z).toString()
  ];

  for (let i = 0; i < 3; i++) {
    // NOTE: This helps avoid clearing selection when possible
    if (ui.shape.box.stretchElts[i].value !== values[i]) {
      ui.shape.box.stretchElts[i].value = values[i];
    }
  }
}

ui.newNodeButton = <HTMLButtonElement>document.querySelector("button.new-node");
ui.newNodeButton.addEventListener("click", onNewNodeClick);
ui.renameNodeButton = <HTMLButtonElement>document.querySelector("button.rename-node");
//ui.renameNodeButton.addEventListener("click", onRenameNodeClick);
ui.duplicateNodeButton = <HTMLButtonElement>document.querySelector("button.duplicate-node");
//ui.duplicateNodeButton.addEventListener("click", onDuplicateNodeClick);
ui.deleteNodeButton = <HTMLButtonElement>document.querySelector("button.delete-node");
//ui.deleteNodeButton.addEventListener("click", onDeleteNodeClick);

// Inspector
ui.inspectorElt = <HTMLDivElement>document.querySelector(".inspector");

ui.transform = {
  positionElts: <any>ui.inspectorElt.querySelectorAll(".transform .position input"),
  orientationElts: <any>ui.inspectorElt.querySelectorAll(".transform .orientation input"),
  scaleElts: <any>ui.inspectorElt.querySelectorAll(".transform .scale input"),
};

ui.shape = {
  typeElt: <any>ui.inspectorElt.querySelector(".shape .type select"),
  offsetElts: <any>ui.inspectorElt.querySelectorAll(".shape .offset input"),
  box: {
    tbodyElt: <any>ui.inspectorElt.querySelector(".box-shape"),
    sizeElts: <any>ui.inspectorElt.querySelectorAll(".box-shape .size input"),
    stretchElts: <any>ui.inspectorElt.querySelectorAll(".box-shape .stretch input")
  }
};

for (let transformType in ui.transform) {
  let inputs: HTMLInputElement[] = (<any>ui).transform[transformType];
  for (let input of inputs) input.addEventListener("change", onTransformInputChange);
}

function onNewNodeClick() {
  // TODO: Allow choosing shape and default texture color
  SupClient.dialogs.prompt("Enter a name for the node.", null, "Node", "Create", (name) => {
    if (name == null) return;

    let options = SupClient.getTreeViewInsertionPoint(ui.nodesTreeView);

    let offset = new THREE.Vector3(0, 0, -10).applyQuaternion(engine.cameraActor.getGlobalOrientation());
    let position = engine.cameraActor.getGlobalPosition().add(offset);

    let unitRatio = data.cubicModelUpdater.cubicModelAsset.pub.unitRatio;

    if (options.parentId != null) {
      let inverseParentMatrix = new THREE.Matrix4().getInverse(data.cubicModelUpdater.cubicModelRenderer.byNodeId[options.parentId].pivot.matrixWorld);
      position.applyMatrix4(inverseParentMatrix);
    } else {
      position.multiplyScalar(unitRatio);
    }

    (<any>options).transform = { position };
    (<any>options).shape = {
      type: "box",
      offset: { x: 0, y: 0, z: 0 },
      settings: {
        width: unitRatio, height: unitRatio, depth: unitRatio,
        stretch: { x: 1, y: 1, z: 1 }
      }
    };

    socket.emit("edit:assets", info.assetId, "addNode", name, options, (err: string, nodeId: string) => {
      if (err != null) { alert(err); return; }

      ui.nodesTreeView.clearSelection();
      ui.nodesTreeView.addToSelection(ui.nodesTreeView.treeRoot.querySelector(`li[data-id='${nodeId}']`));
      setupSelectedNode();
    });

  });
}

function onTransformInputChange(event: any) {
  if (ui.nodesTreeView.selectedNodes.length !== 1) return;

  let transformType = event.target.parentElement.parentElement.parentElement.className;
  let inputs: HTMLInputElement[] = (<any>ui).transform[`${transformType}Elts`];

  let value = {
    x: parseFloat(inputs[0].value),
    y: parseFloat(inputs[1].value),
    z: parseFloat(inputs[2].value),
  };

  if (transformType === "orientation") {
    let euler = new THREE.Euler(THREE.Math.degToRad(value.x), THREE.Math.degToRad(value.y), THREE.Math.degToRad(value.z));
    let quaternion = new THREE.Quaternion().setFromEuler(euler);
    value = { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w };
  }
  let nodeId = ui.nodesTreeView.selectedNodes[0].dataset.id;

  socket.emit("edit:assets", info.assetId, "setNodeProperty", nodeId, transformType, value, (err: string) => { if (err != null) alert(err); });
}
