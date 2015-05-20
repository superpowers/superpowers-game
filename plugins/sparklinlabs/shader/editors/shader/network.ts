import info from "./info";
import ui, { setupUniform, setUniformValueInputs, setupAttribute } from "./ui";
import {setupPreview } from "./engine";
import ShaderAsset from "../../data/ShaderAsset";
import { UniformPub } from "../../data/Uniforms";
import { AttributePub } from "../../data/Attributes";

export let data: { projectClient?: SupClient.ProjectClient, shaderAsset?: ShaderAsset };

export let socket = SupClient.connect(info.projectId);
socket.on("connect", onConnected);
socket.on("disconnect", SupClient.onDisconnected);


function onConnected() {
  data = { projectClient: new SupClient.ProjectClient(socket) };

  data.projectClient.subAsset(info.assetId, "shader", { onAssetReceived, onAssetEdited, onAssetTrashed })
}

function onAssetReceived(assetId: string, asset: ShaderAsset) {
  data.shaderAsset = asset;

  for (let uniform of asset.pub.uniforms) setupUniform(uniform);
  for (let attribute of asset.pub.attributes) setupAttribute(attribute);
  ui.vertexTextArea.value = asset.pub.vertexShader;
  ui.fragmentTextArea.value = asset.pub.fragmentShader;

  setupPreview();
}

let onEditCommands: any = {};
function onAssetEdited(id: string, command: string, ...args: any[]) {
  let commandFunction = onEditCommands[`${command}`];
  if (commandFunction != null) commandFunction.apply(this, args);

  setupPreview();
}

onEditCommands.setProperty = (path: string, value: any) => {
  switch (path) {
    case "vertexShader":
      ui.vertexTextArea.value = value;
      break;
    case "fragmentShader":
      ui.fragmentTextArea.value = value;
      break;
  }
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

function onAssetTrashed() {
  SupClient.onAssetTrashed();
}
