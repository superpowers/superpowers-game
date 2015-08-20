import info from "./info";
import { data, editAsset } from "./network";
import { setupPreview } from "./engine";
import Uniforms, { UniformPub } from "../../data/Uniforms";
import Attributes, { AttributePub } from "../../data/Attributes";

let PerfectResize = require("perfect-resize");

let ui: {
  uniformsList?: HTMLTableElement;
  attributesList?: HTMLTableElement;
  vertexEditor?: TextEditorWidget;
  vertexSaveElt?: HTMLButtonElement;
  fragmentEditor?: TextEditorWidget;
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
  (<any>rowElt.dataset).id = uniform.id;
  ui.uniformsList.appendChild(rowElt);

  let nameElt = document.createElement("td");
  let nameInputElt = document.createElement("input");
  nameInputElt.classList.add("name");
  nameInputElt.addEventListener("change", (event: any) => {
    if (event.target.value === "") editAsset("deleteUniform", (<any>rowElt.dataset).id);
    else editAsset("setUniformProperty", (<any>rowElt.dataset).id, "name", event.target.value);
  })
  nameInputElt.value = uniform.name;
  nameElt.appendChild(nameInputElt);
  rowElt.appendChild(nameElt);

  let typeElt = document.createElement("td");
  let selectTypeElt = document.createElement("select");
  for (let type of Uniforms.schema.type.items) {
    let optionElt = document.createElement("option");
    optionElt.textContent = type;
    selectTypeElt.appendChild(optionElt);
  }
  selectTypeElt.classList.add("type");
  selectTypeElt.addEventListener("change", (event: any) => {
    editAsset("setUniformProperty", (<any>rowElt.dataset).id, "type", event.target.value);
  })
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
      floatInputElt.addEventListener("change", (event: any) => { editAsset("setUniformProperty", id, "value", parseFloat(event.target.value)); })
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
      textInputElt.addEventListener("change", (event: any) => { editAsset("setUniformProperty", id, "value", event.target.value); })
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
    })
    inputElt.value = uniform.value[i];
    parentElt.appendChild(inputElt);
  }
}

let newUniformInput = <HTMLInputElement>document.querySelector(".new-uniform input");
newUniformInput.addEventListener("keyup", (event: any) => {
  if (event.keyCode === 13) {
    editAsset("newUniform", event.target.value);
    event.target.value = "";
  }
})

ui.attributesList = <HTMLTableElement>document.querySelector(".attributes tbody");
export function setupAttribute(attribute: AttributePub) {
  let rowElt = document.createElement("tr");
  (<any>rowElt.dataset).id = attribute.id;
  ui.attributesList.appendChild(rowElt);

  let nameElt = document.createElement("td");
  let nameInputElt = document.createElement("input");
  nameInputElt.classList.add("name");
  nameInputElt.addEventListener("change", (event: any) => {
    if (event.target.value === "") editAsset("deleteAttribute", (<any>rowElt.dataset).id);
    else editAsset("setAttributeProperty", (<any>rowElt.dataset).id, "name", event.target.value);
  })
  nameInputElt.value = attribute.name;
  nameElt.appendChild(nameInputElt);
  rowElt.appendChild(nameElt);

  let typeElt = document.createElement("td");
  let selectTypeElt = document.createElement("select");
  for (let type of Attributes.schema.type.items) {
    let optionElt = document.createElement("option");
    optionElt.textContent = type;
    selectTypeElt.appendChild(optionElt);
  }
  selectTypeElt.classList.add("type");
  selectTypeElt.addEventListener("change", (event: any) => { editAsset("setAttributeProperty", (<any>rowElt.dataset).id, "type", event.target.value); })
  selectTypeElt.value = attribute.type;
  typeElt.appendChild(selectTypeElt);
  rowElt.appendChild(typeElt);

  let valueElt = document.createElement("td");
  valueElt.textContent = "Random";
  rowElt.appendChild(valueElt);
}

let newAttributeInput = <HTMLInputElement>document.querySelector(".new-attribute input");
newAttributeInput.addEventListener("keyup", (event: any) => {
  if (event.keyCode === 13) {
    editAsset("newAttribute", event.target.value);
    event.target.value = "";
  }
})

let shadersPane = document.querySelector(".shaders");
let shaderPaneResizeHandle = new PerfectResize(shadersPane, "bottom");
shaderPaneResizeHandle.on("drag", () => {
  ui.vertexEditor.codeMirrorInstance.refresh();
  ui.fragmentEditor.codeMirrorInstance.refresh();
});

let fragmentShadersPane = shadersPane.querySelector(".fragment");
let fragmentShaderPaneResizeHandle = new PerfectResize(fragmentShadersPane, "right");
fragmentShaderPaneResizeHandle.on("drag", () => {
  ui.vertexEditor.codeMirrorInstance.refresh();
  ui.fragmentEditor.codeMirrorInstance.refresh();
});

ui.vertexSaveElt = <HTMLButtonElement>document.querySelector(".vertex button");
ui.vertexSaveElt.addEventListener("click", (event) => { editAsset("saveVertexShader"); });
ui.fragmentSaveElt = <HTMLButtonElement>document.querySelector(".fragment button");
ui.fragmentSaveElt.addEventListener("click", (event) => { editAsset("saveFragmentShader"); });

export function setupEditors(clientId: number) {
  let vertexTextArea = <HTMLTextAreaElement>document.querySelector(".vertex textarea");
  ui.vertexEditor = new TextEditorWidget(data.projectClient, clientId, vertexTextArea, {
    mode: "x-shader/x-vertex",
    sendOperationCallback: (operation: OperationData) => {
      editAsset("editVertexShader", operation, data.shaderAsset.vertexDocument.getRevisionId());
    },
    saveCallback: () => { editAsset("saveVertexShader"); }
  });

  let fragmentTextArea = <HTMLTextAreaElement>document.querySelector(".fragment textarea");
  ui.fragmentEditor = new TextEditorWidget(data.projectClient, clientId, fragmentTextArea, {
    mode: "x-shader/x-fragment",
    sendOperationCallback: (operation: OperationData) => {
      editAsset("editFragmentShader", operation, data.shaderAsset.fragmentDocument.getRevisionId());
    },
    saveCallback: () => { editAsset("saveFragmentShader"); }
  });
}

let previewPane = document.querySelector(".preview");
new PerfectResize(previewPane, "right");
ui.previewTypeSelect = <HTMLSelectElement>previewPane.querySelector("select");
ui.previewTypeSelect.addEventListener("change", () => {
  ui.previewAssetInput.style.display = (ui.previewTypeSelect.value === "Asset") ? "initial" : "none";
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
