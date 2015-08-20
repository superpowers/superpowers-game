import info from "./info";
import ui, { setupUniform, setUniformValueInputs, setupAttribute, setupEditors } from "./ui";
import { setupPreview } from "./engine";
import ShaderAsset from "../../data/ShaderAsset";
import { UniformPub } from "../../data/Uniforms";
import { AttributePub } from "../../data/Attributes";

export let data: { projectClient?: SupClient.ProjectClient, shaderAsset?: ShaderAsset, previewComponentUpdater?: any };

export let socket = SupClient.connect(info.projectId);
socket.on("welcome", onWelcomed);
socket.on("disconnect", SupClient.onDisconnected);

function onWelcomed(clientId: number) {
  data = { projectClient: new SupClient.ProjectClient(socket, { subEntries: true }) };
  setupEditors(clientId);

  data.projectClient.subAsset(info.assetId, "shader", { onAssetReceived, onAssetEdited, onAssetTrashed });
}

function onAssetReceived(assetId: string, asset: ShaderAsset) {
  data.shaderAsset = asset;

  for (let uniform of asset.pub.uniforms) setupUniform(uniform);
  for (let attribute of asset.pub.attributes) setupAttribute(attribute);
  ui.vertexEditor.setText(asset.pub.vertexShader.draft);
  ui.vertexSaveElt.disabled = asset.pub.vertexShader.draft === asset.pub.vertexShader.text;
  ui.fragmentEditor.setText(asset.pub.fragmentShader.draft);
  ui.fragmentSaveElt.disabled = asset.pub.fragmentShader.draft === asset.pub.fragmentShader.text;

  setupPreview();
}

export function editAsset(...args: any[]) {
  let callback: Function;
  if (typeof args[args.length-1] === "function") callback = args.pop();

  args.push((err: string, id: string) => {
    if (err != null) { alert(err); return; }
    if (callback != null) callback(id);
  });
  socket.emit("edit:assets", info.assetId, ...args);
}

let onEditCommands: any = {};
function onAssetEdited(id: string, command: string, ...args: any[]) {
  let commandFunction = onEditCommands[`${command}`];
  if (commandFunction != null) commandFunction.apply(this, args);

  if (ui.previewTypeSelect.value !== "Asset" && command !== "editVertexShader" && command !== "editFragmentShader")
    setupPreview();
}

onEditCommands.newUniform = (uniform: UniformPub) => { setupUniform(uniform); }
onEditCommands.deleteUniform = (id: string) => {
  let rowElt = <HTMLTableRowElement>ui.uniformsList.querySelector(`[data-id='${id}']`);
  rowElt.parentElement.removeChild(rowElt);
}
onEditCommands.setUniformProperty = (id: string, key: string, value: any) => {
  let rowElt = <HTMLDivElement>ui.uniformsList.querySelector(`[data-id='${id}']`);
  if (key === "value") {
    let type = data.shaderAsset.uniforms.byId[id].type;
    switch(type) {
      case "f":
        let floatInputElt = <HTMLInputElement>rowElt.querySelector(".float");
        floatInputElt.value = value;
        break;

      case "c":
      case "v2":
      case "v3":
      case "v4":
        setUniformValues(rowElt, type, value);
        break;
      case "t":
        let textInputElt = <HTMLInputElement>rowElt.querySelector(".text");
        textInputElt.value = value;
        break;
    }

  } else {
    let fieldElt = <HTMLInputElement>rowElt.querySelector(`.${key}`);
    fieldElt.value = value;
  }
  if (key === "type") setUniformValueInputs(id);
}

function setUniformValues(parentElt: HTMLDivElement, name: string, values: number[]) {
  for (let i = 0; i < values.length; i++)
    (<HTMLInputElement>parentElt.querySelector(`.${name}_${i}`)).value = values[i].toString();
}

onEditCommands.newAttribute = (attribute: AttributePub) => { setupAttribute(attribute); }
onEditCommands.deleteAttribute = (id: string) => {
  let rowElt = <HTMLTableRowElement>ui.attributesList.querySelector(`[data-id='${id}']`);
  rowElt.parentElement.removeChild(rowElt);
}
onEditCommands.setAttributeProperty = (id: string, key: string, value: any) => {
  let rowElt = <HTMLDivElement>ui.attributesList.querySelector(`[data-id='${id}']`);
  let fieldElt = <HTMLInputElement>rowElt.querySelector(`.${key}`);
  fieldElt.value = value;
}

onEditCommands.editVertexShader = (operationData: OperationData) => {
  ui.vertexEditor.receiveEditText(operationData);
  ui.vertexSaveElt.disabled = false;
}
onEditCommands.saveVertexShader = () => { ui.vertexSaveElt.disabled = true; }
onEditCommands.editFragmentShader = (operationData: OperationData) => {
  ui.fragmentEditor.receiveEditText(operationData);
  ui.fragmentSaveElt.disabled = false;
}
onEditCommands.saveFragmentShader = () => { ui.fragmentSaveElt.disabled = true; }

function onAssetTrashed() {
  SupClient.onAssetTrashed();
}
