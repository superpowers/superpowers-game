import { data, editAsset } from "./network";
import { setupPreview } from "./engine";
import Uniforms, { UniformPub } from "../../data/Uniforms";
import Attributes, { AttributePub } from "../../data/Attributes";

/* tslint:disable */
let PerfectResize = require("perfect-resize");
/* tslint:enable */

let ui: {
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

SupClient.setupHotkeys();

ui.uniformsList = <HTMLTableElement>document.querySelector(".uniforms tbody");
export function setupUniform(uniform: UniformPub) {
  let rowElt = document.createElement("tr");
  rowElt.dataset["id"] = uniform.id;
  ui.uniformsList.insertBefore(rowElt, ui.uniformsList.lastChild);

  let nameElt = document.createElement("td");
  let nameInputElt = document.createElement("input");
  nameInputElt.classList.add("name");
  nameInputElt.addEventListener("change", (event: any) => {
    if (event.target.value === "") editAsset("deleteUniform", rowElt.dataset["id"]);
    else editAsset("setUniformProperty", rowElt.dataset["id"], "name", event.target.value);
  });
  nameInputElt.value = uniform.name;
  nameElt.appendChild(nameInputElt);
  rowElt.appendChild(nameElt);

  let typeElt = document.createElement("td");
  let selectTypeElt = document.createElement("select");
  for (let type of Uniforms.schema["type"].items as string[]) {
    let optionElt = document.createElement("option");
    optionElt.textContent = type;
    selectTypeElt.appendChild(optionElt);
  }
  selectTypeElt.classList.add("type");
  selectTypeElt.addEventListener("change", (event: any) => {
    editAsset("setUniformProperty", rowElt.dataset["id"], "type", event.target.value);
  });
  selectTypeElt.value = uniform.type;
  typeElt.appendChild(selectTypeElt);
  rowElt.appendChild(typeElt);

  let valueElt = document.createElement("td");
  rowElt.appendChild(valueElt);
  let valueDivElt = document.createElement("div");
  valueDivElt.classList.add("value");
  valueElt.appendChild(valueDivElt);
  setUniformValueInputs(uniform.id);
}

export function setUniformValueInputs(id: string) {
  let uniform = data.shaderAsset.uniforms.byId[id];
  let valueRowElt = <HTMLDivElement>ui.uniformsList.querySelector(`[data-id='${id}'] .value`);

  while (valueRowElt.children.length > 0) valueRowElt.removeChild(valueRowElt.children[0]);

  switch(uniform.type) {
    case "f":
      let floatInputElt = document.createElement("input");
      floatInputElt.type = "number";
      floatInputElt.classList.add("float");
      floatInputElt.addEventListener("change", (event: any) => { editAsset("setUniformProperty", id, "value", parseFloat(event.target.value)); });
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
      let textInputElt = document.createElement("input");
      textInputElt.classList.add("text");
      textInputElt.addEventListener("change", (event: any) => { editAsset("setUniformProperty", id, "value", event.target.value); });
      textInputElt.value = uniform.value;
      valueRowElt.appendChild(textInputElt);
      break;
  }
}

function setArrayUniformInputs(id: string, parentElt: HTMLDivElement, name: string) {
  let uniform = data.shaderAsset.uniforms.byId[id];

  for (let i = 0; i < uniform.value.length; i++) {
    let inputElt = document.createElement("input");
    inputElt.type = "number";
    inputElt.classList.add(`${name}_${i}`);
    inputElt.addEventListener("change", (event: any) => {
      let values = <number[]>[];
      for (let j = 0; j < uniform.value.length; j++) {
        let elt = <HTMLInputElement>parentElt.querySelector(`.${name}_${j}`);
        values.push(parseFloat(elt.value));
      }
      editAsset("setUniformProperty", id, "value", values);
    });
    inputElt.value = uniform.value[i];
    parentElt.appendChild(inputElt);
  }
}

let newUniformInput = <HTMLInputElement>document.querySelector(".uniforms .new input");
newUniformInput.addEventListener("keyup", (event: any) => {
  if (event.keyCode === 13) {
    editAsset("newUniform", event.target.value);
    event.target.value = "";
  }
});

ui.useLightUniformsCheckbox = <HTMLInputElement>document.getElementById("use-light-uniforms");
ui.useLightUniformsCheckbox.addEventListener("change", (event: any) => {
  editAsset("setProperty", "useLightUniforms", event.target.checked);
});

ui.attributesList = <HTMLTableElement>document.querySelector(".attributes tbody");
export function setupAttribute(attribute: AttributePub) {
  let rowElt = document.createElement("tr");
  rowElt.dataset["id"] = attribute.id;
  ui.attributesList.insertBefore(rowElt, ui.attributesList.lastChild);

  let nameElt = document.createElement("td");
  let nameInputElt = document.createElement("input");
  nameInputElt.classList.add("name");
  nameInputElt.addEventListener("change", (event: any) => {
    if (event.target.value === "") editAsset("deleteAttribute", rowElt.dataset["id"]);
    else editAsset("setAttributeProperty", rowElt.dataset["id"], "name", event.target.value);
  });
  nameInputElt.value = attribute.name;
  nameElt.appendChild(nameInputElt);
  rowElt.appendChild(nameElt);

  let typeElt = document.createElement("td");
  let selectTypeElt = document.createElement("select");
  for (let type of Attributes.schema["type"].items as string[]) {
    let optionElt = document.createElement("option");
    optionElt.textContent = type;
    selectTypeElt.appendChild(optionElt);
  }
  selectTypeElt.classList.add("type");
  selectTypeElt.addEventListener("change", (event: any) => { editAsset("setAttributeProperty", rowElt.dataset["id"], "type", event.target.value); });
  selectTypeElt.value = attribute.type;
  typeElt.appendChild(selectTypeElt);
  rowElt.appendChild(typeElt);

  let valueElt = document.createElement("td");
  valueElt.textContent = "Random";
  rowElt.appendChild(valueElt);
}

let newAttributeInput = <HTMLInputElement>document.querySelector(".attributes .new input");
newAttributeInput.addEventListener("keyup", (event: any) => {
  if (event.keyCode === 13) {
    editAsset("newAttribute", event.target.value);
    event.target.value = "";
  }
});

let shadersPane = document.querySelector(".shaders");
let shaderPaneResizeHandle = new PerfectResize(shadersPane, "bottom");
shaderPaneResizeHandle.on("drag", () => {
  ui.vertexEditor.codeMirrorInstance.refresh();
  ui.fragmentEditor.codeMirrorInstance.refresh();
});

function onSaveVertex() {
  // if (!ui.vertexHeader.classList.contains("has-errors")) editAsset("saveVertexShader");
  editAsset("saveVertexShader");
}

function onSaveFragment() {
  if (!ui.fragmentHeader.classList.contains("has-errors")) editAsset("saveFragmentShader");
}

let fragmentShadersPane = shadersPane.querySelector(".fragment");
let fragmentShaderPaneResizeHandle = new PerfectResize(fragmentShadersPane, "right");
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

export function setupEditors(clientId: number) {
  let vertexTextArea = <HTMLTextAreaElement>document.querySelector(".vertex textarea");
  ui.vertexEditor = new TextEditorWidget(data.projectClient, clientId, vertexTextArea, {
    mode: "x-shader/x-vertex",
    extraKeys: {
      "Ctrl-S": () => { onSaveVertex(); },
      "Cmd-S": () => { onSaveVertex(); },
    },
    sendOperationCallback: (operation: OperationData) => {
      editAsset("editVertexShader", operation, data.shaderAsset.vertexDocument.getRevisionId());
    }
  });

  let fragmentTextArea = <HTMLTextAreaElement>document.querySelector(".fragment textarea");
  ui.fragmentEditor = new TextEditorWidget(data.projectClient, clientId, fragmentTextArea, {
    mode: "x-shader/x-fragment",
    extraKeys: {
      "Ctrl-S": () => { onSaveFragment(); },
      "Cmd-S": () => { onSaveFragment(); },
    },
    sendOperationCallback: (operation: OperationData) => {
      editAsset("editFragmentShader", operation, data.shaderAsset.fragmentDocument.getRevisionId());
    }
  });
}

let previewPane = document.querySelector(".preview");
/* tslint:disable:no-unused-expression */
new PerfectResize(previewPane, "right");
/* tslint:enable:no-unused-expression */
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

  let entry = SupClient.findEntryByPath(data.projectClient.entries.pub, event.target.value);
  if (entry == null || (entry.type !== "sprite" && entry.type !== "model")) return;

  ui.previewEntry = entry;
  setupPreview();
});
