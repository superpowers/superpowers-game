import info from "./info";
import { socket, data } from "./network";
import { setupPreview } from "./engine";
import Uniforms, { UniformPub } from "../../data/Uniforms";
import Attributes, { AttributePub } from "../../data/Attributes";

let ui: {
  uniformsList?: HTMLTableElement;
  attributesList?: HTMLTableElement;
  vertexTextArea?: HTMLTextAreaElement;
  fragmentTextArea?: HTMLTextAreaElement;

  previewTypeSelect?: HTMLSelectElement;
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
    if (event.target.value === "") {
      socket.emit("edit:assets", info.assetId, "deleteUniform", (<any>rowElt.dataset).id, (err: string) => {
      if (err != null) alert(err);
    });
      return;
    }

    socket.emit("edit:assets", info.assetId, "setUniformProperty", (<any>rowElt.dataset).id, "name", event.target.value, (err: string) => {
      if (err != null) alert(err);
    });
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
    socket.emit("edit:assets", info.assetId, "setUniformProperty", (<any>rowElt.dataset).id, "type", event.target.value, (err: string) => {
      if (err != null) alert(err);
    });
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
      let inputElt = document.createElement("input");
      inputElt.type = "number";
      inputElt.classList.add("float");
      inputElt.addEventListener("change", (event: any) => {
        socket.emit("edit:assets", info.assetId, "setUniformProperty", id, "value", parseFloat(event.target.value), (err: string) => {
          if (err != null) alert(err);
        });
      })
      inputElt.value = uniform.value;
      valueRowElt.appendChild(inputElt);
      break;

    case "c":
    case "v2":
    case "v3":
    case "v4":
      setArrayUniformInputs(id, valueRowElt, uniform.type);
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
      socket.emit("edit:assets", info.assetId, "setUniformProperty", id, "value", values, (err: string) => {
        if (err != null) alert(err);
      });
    })
    inputElt.value = uniform.value[i];
    parentElt.appendChild(inputElt);
  }
}

let newUniformInput = <HTMLInputElement>document.querySelector(".new-uniform input");
newUniformInput.addEventListener("keyup", (event: any) => {
  if (event.keyCode === 13) {
    socket.emit("edit:assets", info.assetId, "newUniform", event.target.value, (err: string) => {
      if (err != null) alert(err);
    });
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
    if (event.target.value === "") {
      socket.emit("edit:assets", info.assetId, "deleteAttribute", (<any>rowElt.dataset).id, (err: string) => {
      if (err != null) alert(err);
    });
      return;
    }

    socket.emit("edit:assets", info.assetId, "setAttributeProperty", (<any>rowElt.dataset).id, "name", event.target.value, (err: string) => {
      if (err != null) alert(err);
    });
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
  selectTypeElt.addEventListener("change", (event: any) => {
    socket.emit("edit:assets", info.assetId, "setAttributeProperty", (<any>rowElt.dataset).id, "type", event.target.value, (err: string) => {
      if (err != null) alert(err);
    });
  })
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
    socket.emit("edit:assets", info.assetId, "newAttribute", event.target.value, (err: string) => {
      if (err != null) alert(err);
    });
    event.target.value = "";
  }
})

ui.vertexTextArea = <HTMLTextAreaElement>document.querySelector(".vertex textarea");
ui.vertexTextArea.addEventListener("change", (event: any) => {
  socket.emit("edit:assets", info.assetId, "setProperty", "vertexShader", event.target.value, (err: string) => {
    if (err != null) alert(err);
  });
})

ui.fragmentTextArea = <HTMLTextAreaElement>document.querySelector(".fragment textarea");
ui.fragmentTextArea.addEventListener("change", (event: any) => {
  socket.emit("edit:assets", info.assetId, "setProperty", "fragmentShader", event.target.value, (err: string) => {
    if (err != null) alert(err);
  });
})

ui.previewTypeSelect = <HTMLSelectElement>document.querySelector(".preview select");
ui.previewTypeSelect.addEventListener("change", () => { setupPreview(); });
