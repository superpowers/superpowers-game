import { data } from "./network";
import { setupPreview } from "./engine";
import Uniforms, { UniformPub } from "../../data/Uniforms";
import Attributes, { AttributePub } from "../../data/Attributes";

import * as ResizeHandle from "resize-handle";

const ui: {
  uniformsList?: HTMLTableElement;
  useLightUniformsCheckbox?: HTMLInputElement;
  attributesList?: HTMLTableElement;
  vertexEditor?: TextEditorWidget;
  vertexHeader?: HTMLDivElement;
  vertexSaveElt?: HTMLButtonElement;
  fragmentEditor?: TextEditorWidget;
  fragmentHeader?: HTMLDivElement;
  fragmentSaveElt?: HTMLButtonElement;

  previewTypeSelect?: HTMLSelectElement;
  previewAssetInput?: HTMLInputElement;
  previewEntry?: { id: string; type: string; };
} = {};
export default ui;

ui.uniformsList = <HTMLTableElement>document.querySelector(".uniforms tbody");
export function setupUniform(uniform: UniformPub) {
  const rowElt = document.createElement("tr");
  rowElt.dataset["id"] = uniform.id;
  ui.uniformsList.insertBefore(rowElt, ui.uniformsList.lastChild);

  const nameElt = document.createElement("td");
  const nameInputElt = document.createElement("input");
  nameInputElt.classList.add("name");
  nameInputElt.addEventListener("change", (event: any) => {
    if (event.target.value === "") data.projectClient.editAsset(SupClient.query.asset, "deleteUniform", rowElt.dataset["id"]);
    else data.projectClient.editAsset(SupClient.query.asset, "setUniformProperty", rowElt.dataset["id"], "name", event.target.value);
  });
  nameInputElt.value = uniform.name;
  nameElt.appendChild(nameInputElt);
  rowElt.appendChild(nameElt);

  const typeElt = document.createElement("td");
  const selectTypeElt = document.createElement("select");
  for (const type of Uniforms.schema["type"].items as string[]) {
    const optionElt = document.createElement("option");
    optionElt.textContent = type;
    selectTypeElt.appendChild(optionElt);
  }
  selectTypeElt.classList.add("type");
  selectTypeElt.addEventListener("change", (event: any) => {
    data.projectClient.editAsset(SupClient.query.asset, "setUniformProperty", rowElt.dataset["id"], "type", event.target.value);
  });
  selectTypeElt.value = uniform.type;
  typeElt.appendChild(selectTypeElt);
  rowElt.appendChild(typeElt);

  const valueElt = document.createElement("td");
  rowElt.appendChild(valueElt);
  const valueDivElt = document.createElement("div");
  valueDivElt.classList.add("value");
  valueElt.appendChild(valueDivElt);
  setUniformValueInputs(uniform.id);
}

export function setUniformValueInputs(id: string) {
  const uniform = data.shaderAsset.uniforms.byId[id];
  const valueRowElt = <HTMLDivElement>ui.uniformsList.querySelector(`[data-id='${id}'] .value`);

  while (valueRowElt.children.length > 0) valueRowElt.removeChild(valueRowElt.children[0]);

  switch(uniform.type) {
    case "f":
      const floatInputElt = document.createElement("input");
      floatInputElt.type = "number";
      floatInputElt.classList.add("float");
      floatInputElt.addEventListener("change", (event: any) => {
        data.projectClient.editAsset(SupClient.query.asset, "setUniformProperty", id, "value", parseFloat(event.target.value));
      });
      floatInputElt.value = uniform.value;
      valueRowElt.appendChild(floatInputElt);
      break;

    case "c":
    case "v2":
    case "v3":
    case "v4":
      setArrayUniformInputs(id, valueRowElt, uniform.type);
      break;

    case "t":
      const textInputElt = document.createElement("input");
      textInputElt.classList.add("text");
      textInputElt.addEventListener("change", (event: any) => {
        data.projectClient.editAsset(SupClient.query.asset, "setUniformProperty", id, "value", event.target.value);
      });
      textInputElt.value = uniform.value;
      valueRowElt.appendChild(textInputElt);
      break;
  }
}

function setArrayUniformInputs(id: string, parentElt: HTMLDivElement, name: string) {
  const uniform = data.shaderAsset.uniforms.byId[id];

  for (let i = 0; i < uniform.value.length; i++) {
    const inputElt = document.createElement("input");
    inputElt.type = "number";
    inputElt.classList.add(`${name}_${i}`);
    inputElt.addEventListener("change", (event: any) => {
      const values = <number[]>[];
      for (let j = 0; j < uniform.value.length; j++) {
        const elt = <HTMLInputElement>parentElt.querySelector(`.${name}_${j}`);
        values.push(parseFloat(elt.value));
      }
      data.projectClient.editAsset(SupClient.query.asset, "setUniformProperty", id, "value", values);
    });
    inputElt.value = uniform.value[i];
    parentElt.appendChild(inputElt);
  }
}

const newUniformInput = <HTMLInputElement>document.querySelector(".uniforms .new input");
newUniformInput.addEventListener("keyup", (event: any) => {
  if (event.keyCode === 13) {
    data.projectClient.editAsset(SupClient.query.asset, "newUniform", event.target.value);
    event.target.value = "";
  }
});

ui.useLightUniformsCheckbox = <HTMLInputElement>document.getElementById("use-light-uniforms");
ui.useLightUniformsCheckbox.addEventListener("change", (event: any) => {
  data.projectClient.editAsset(SupClient.query.asset, "setProperty", "useLightUniforms", event.target.checked);
});

ui.attributesList = <HTMLTableElement>document.querySelector(".attributes tbody");
export function setupAttribute(attribute: AttributePub) {
  const rowElt = document.createElement("tr");
  rowElt.dataset["id"] = attribute.id;
  ui.attributesList.insertBefore(rowElt, ui.attributesList.lastChild);

  const nameElt = document.createElement("td");
  const nameInputElt = document.createElement("input");
  nameInputElt.classList.add("name");
  nameInputElt.addEventListener("change", (event: any) => {
    if (event.target.value === "") data.projectClient.editAsset(SupClient.query.asset, "deleteAttribute", rowElt.dataset["id"]);
    else data.projectClient.editAsset(SupClient.query.asset, "setAttributeProperty", rowElt.dataset["id"], "name", event.target.value);
  });
  nameInputElt.value = attribute.name;
  nameElt.appendChild(nameInputElt);
  rowElt.appendChild(nameElt);

  const typeElt = document.createElement("td");
  const selectTypeElt = document.createElement("select");
  for (const type of Attributes.schema["type"].items as string[]) {
    const optionElt = document.createElement("option");
    optionElt.textContent = type;
    selectTypeElt.appendChild(optionElt);
  }
  selectTypeElt.classList.add("type");
  selectTypeElt.addEventListener("change", (event: any) => { data.projectClient.editAsset(SupClient.query.asset, "setAttributeProperty", rowElt.dataset["id"], "type", event.target.value); });
  selectTypeElt.value = attribute.type;
  typeElt.appendChild(selectTypeElt);
  rowElt.appendChild(typeElt);

  const valueElt = document.createElement("td");
  valueElt.textContent = "Random";
  rowElt.appendChild(valueElt);
}

const newAttributeInput = <HTMLInputElement>document.querySelector(".attributes .new input");
newAttributeInput.addEventListener("keyup", (event: any) => {
  if (event.keyCode === 13) {
    data.projectClient.editAsset(SupClient.query.asset, "newAttribute", event.target.value);
    event.target.value = "";
  }
});

const shadersPane = document.querySelector(".shaders") as HTMLDivElement;
const shaderPaneResizeHandle = new ResizeHandle(shadersPane, "bottom");
shaderPaneResizeHandle.on("drag", () => {
  ui.vertexEditor.codeMirrorInstance.refresh();
  ui.fragmentEditor.codeMirrorInstance.refresh();
});

function onSaveVertex() {
  if (!ui.vertexHeader.classList.contains("has-errors")) data.projectClient.editAsset(SupClient.query.asset, "saveVertexShader");
}

function onSaveFragment() {
  if (!ui.fragmentHeader.classList.contains("has-errors")) data.projectClient.editAsset(SupClient.query.asset, "saveFragmentShader");
}

const fragmentShadersPane = shadersPane.querySelector(".fragment") as HTMLDivElement;
const fragmentShaderPaneResizeHandle = new ResizeHandle(fragmentShadersPane, "right");
fragmentShaderPaneResizeHandle.on("drag", () => {
  ui.vertexEditor.codeMirrorInstance.refresh();
  ui.fragmentEditor.codeMirrorInstance.refresh();
});

ui.vertexSaveElt = <HTMLButtonElement>document.querySelector(".vertex button");
ui.vertexHeader = <HTMLDivElement>document.querySelector(".vertex .header");
ui.vertexSaveElt.addEventListener("click", onSaveVertex);
ui.fragmentSaveElt = <HTMLButtonElement>document.querySelector(".fragment button");
ui.fragmentHeader = <HTMLDivElement>document.querySelector(".fragment .header");
ui.fragmentSaveElt.addEventListener("click", onSaveFragment);

export function setupEditors(clientId: string) {
  const vertexTextArea = <HTMLTextAreaElement>document.querySelector(".vertex textarea");
  ui.vertexEditor = new TextEditorWidget(data.projectClient, clientId, vertexTextArea, {
    mode: "x-shader/x-vertex",
    extraKeys: {
      "Ctrl-S": () => { onSaveVertex(); },
      "Cmd-S": () => { onSaveVertex(); },
    },
    sendOperationCallback: (operation: OperationData) => {
      data.projectClient.editAsset(SupClient.query.asset, "editVertexShader", operation, data.shaderAsset.vertexDocument.getRevisionId());
    }
  });

  const fragmentTextArea = <HTMLTextAreaElement>document.querySelector(".fragment textarea");
  ui.fragmentEditor = new TextEditorWidget(data.projectClient, clientId, fragmentTextArea, {
    mode: "x-shader/x-fragment",
    extraKeys: {
      "Ctrl-S": () => { onSaveFragment(); },
      "Cmd-S": () => { onSaveFragment(); },
    },
    sendOperationCallback: (operation: OperationData) => {
      data.projectClient.editAsset(SupClient.query.asset, "editFragmentShader", operation, data.shaderAsset.fragmentDocument.getRevisionId());
    }
  });
}

const previewPane = document.querySelector(".preview") as HTMLDivElement;
new ResizeHandle(previewPane, "right");
ui.previewTypeSelect = <HTMLSelectElement>previewPane.querySelector("select");
ui.previewTypeSelect.addEventListener("change", () => {
  ui.previewAssetInput.hidden = ui.previewTypeSelect.value !== "Asset";
  setupPreview();
});

ui.previewAssetInput = <HTMLInputElement>previewPane.querySelector("input");
ui.previewAssetInput.addEventListener("input", (event: any) => {
  if (event.target.value === "") {
    ui.previewEntry = null;
    setupPreview();
    return;
  }

  const entry = SupClient.findEntryByPath(data.projectClient.entries.pub, event.target.value);
  if (entry == null || (entry.type !== "sprite" && entry.type !== "model")) return;

  ui.previewEntry = entry;
  setupPreview();
});
