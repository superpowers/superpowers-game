import ui, { setupUniform, setUniformValueInputs, setupAttribute, setupEditors } from "./ui";
import { setupPreview } from "./engine";
import ShaderAsset from "../../data/ShaderAsset";
import { UniformPub } from "../../data/Uniforms";
import { AttributePub } from "../../data/Attributes";

export let data: { projectClient?: SupClient.ProjectClient, shaderAsset?: ShaderAsset, previewComponentUpdater?: any };

export let socket: SocketIOClient.Socket;
SupClient.i18n.load([], () => {
  socket = SupClient.connect(SupClient.query.project);
  socket.on("welcome", onWelcome);
  socket.on("disconnect", SupClient.onDisconnected);
});

function onWelcome(clientId: string) {
  data = { projectClient: new SupClient.ProjectClient(socket, { subEntries: true }) };
  setupEditors(clientId);

  data.projectClient.subAsset(SupClient.query.asset, "shader", { onAssetReceived, onAssetEdited, onAssetTrashed });
}

function onAssetReceived(assetId: string, asset: ShaderAsset) {
  data.shaderAsset = asset;

  for (const uniform of asset.pub.uniforms) setupUniform(uniform);
  ui.useLightUniformsCheckbox.checked = asset.pub.useLightUniforms;

  for (const attribute of asset.pub.attributes) setupAttribute(attribute);

  ui.vertexEditor.setText(asset.pub.vertexShader.draft);
  if (asset.pub.vertexShader.draft !== asset.pub.vertexShader.text) checkVertexShader();

  ui.fragmentEditor.setText(asset.pub.fragmentShader.draft);
  if (asset.pub.fragmentShader.draft !== asset.pub.fragmentShader.text) checkFragmentShader();

  setupPreview();
}

const onEditCommands: { [command: string]: Function; } = {};
function onAssetEdited(id: string, command: string, ...args: any[]) {
  const commandFunction = onEditCommands[command];
  if (commandFunction != null) commandFunction.apply(this, args);

  if (ui.previewTypeSelect.value !== "Asset" && command !== "editVertexShader" && command !== "editFragmentShader")
    setupPreview();
}

onEditCommands["setProperty"] = (path: string, value: any) => {
  switch (path) {
    case "useLightUniforms":
      ui.useLightUniformsCheckbox.checked = value;
      break;
  }
};

onEditCommands["newUniform"] = (uniform: UniformPub) => { setupUniform(uniform); };
onEditCommands["deleteUniform"] = (id: string) => {
  const rowElt = <HTMLTableRowElement>ui.uniformsList.querySelector(`[data-id='${id}']`);
  rowElt.parentElement.removeChild(rowElt);
};
onEditCommands["setUniformProperty"] = (id: string, key: string, value: any) => {
  const rowElt = <HTMLDivElement>ui.uniformsList.querySelector(`[data-id='${id}']`);
  if (key === "value") {
    const type = data.shaderAsset.uniforms.byId[id].type;
    switch (type) {
      case "f":
        const floatInputElt = <HTMLInputElement>rowElt.querySelector(".float");
        floatInputElt.value = value;
        break;

      case "c":
      case "v2":
      case "v3":
      case "v4":
        setUniformValues(rowElt, type, value);
        break;
      case "t":
        const textInputElt = <HTMLInputElement>rowElt.querySelector(".text");
        textInputElt.value = value;
        break;
    }

  } else {
    const fieldElt = <HTMLInputElement>rowElt.querySelector(`.${key}`);
    fieldElt.value = value;
  }
  if (key === "type") setUniformValueInputs(id);
};

function setUniformValues(parentElt: HTMLDivElement, name: string, values: number[]) {
  for (let i = 0; i < values.length; i++)
    (<HTMLInputElement>parentElt.querySelector(`.${name}_${i}`)).value = values[i].toString();
}

onEditCommands["newAttribute"] = (attribute: AttributePub) => { setupAttribute(attribute); };
onEditCommands["deleteAttribute"] = (id: string) => {
  const rowElt = <HTMLTableRowElement>ui.attributesList.querySelector(`[data-id='${id}']`);
  rowElt.parentElement.removeChild(rowElt);
};
onEditCommands["setAttributeProperty"] = (id: string, key: string, value: any) => {
  const rowElt = <HTMLDivElement>ui.attributesList.querySelector(`[data-id='${id}']`);
  const fieldElt = <HTMLInputElement>rowElt.querySelector(`.${key}`);
  fieldElt.value = value;
};

onEditCommands["editVertexShader"] = (operationData: OperationData) => {
  ui.vertexEditor.receiveEditText(operationData);
  checkVertexShader();
};
onEditCommands["saveVertexShader"] = () => {
  (<any>ui.vertexHeader.classList).toggle("has-draft", false);
  (<any>ui.vertexHeader.classList).toggle("has-errors", false);
  ui.vertexSaveElt.hidden = true;
};

onEditCommands["editFragmentShader"] = (operationData: OperationData) => {
  ui.fragmentEditor.receiveEditText(operationData);
  checkFragmentShader();
};
onEditCommands["saveFragmentShader"] = () => {
  (<any>ui.fragmentHeader.classList).toggle("has-draft", false);
  (<any>ui.fragmentHeader.classList).toggle("has-errors", false);
  ui.fragmentSaveElt.hidden = true;
};

function onAssetTrashed() {
  SupClient.onAssetTrashed();
}

const gl = document.createElement("canvas").getContext("webgl") as WebGLRenderingContext;
function replaceShaderChunk(shader: string) {
  shader = shader.replace(/#include +<([\w\d.]+)>/g, (match, include) => SupEngine.THREE.ShaderChunk[include]);

  for (const lightNumString of ["NUM_DIR_LIGHTS", "NUM_SPOT_LIGHTS", "NUM_POINT_LIGHTS", "NUM_HEMI_LIGHTS"])
    shader = shader.replace(RegExp(lightNumString, "g"), "1");

  return shader;
}

const vertexStart = `precision mediump float;precision mediump int;
#define SHADER_NAME ShaderMaterial
#define VERTEX_TEXTURES
#define GAMMA_FACTOR 2
#define MAX_BONES 251
uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;
#ifdef USE_COLOR
  attribute vec3 color;
#endif
#ifdef USE_MORPHTARGETS
  attribute vec3 morphTarget0;
  attribute vec3 morphTarget1;
  attribute vec3 morphTarget2;
  attribute vec3 morphTarget3;
  #ifdef USE_MORPHNORMALS
    attribute vec3 morphNormal0;
    attribute vec3 morphNormal1;
    attribute vec3 morphNormal2;
    attribute vec3 morphNormal3;
  #else
    attribute vec3 morphTarget4;
    attribute vec3 morphTarget5;
    attribute vec3 morphTarget6;
    attribute vec3 morphTarget7;
  #endif
#endif
#ifdef USE_SKINNING
  attribute vec4 skinIndex;
  attribute vec4 skinWeight;
#endif
`;
const vertexStartLength = vertexStart.split("\n").length;

function checkVertexShader() {
  const shader = gl.createShader(gl.VERTEX_SHADER);
  const shaderCode = replaceShaderChunk(ui.vertexEditor.codeMirrorInstance.getDoc().getValue());
  gl.shaderSource(shader, `${vertexStart}\n${shaderCode}`);
  gl.compileShader(shader);
  const log = gl.getShaderInfoLog(shader);

  const errors = log.split("\n");
  if (errors[errors.length - 1] === "") errors.pop();
  for (let error of errors) {
    error = error.replace("ERROR: 0:", "");
    const lineLimiterIndex = error.indexOf(":");
    const line = parseInt(error.slice(0, lineLimiterIndex), 10) - vertexStartLength;
    const message = error.slice(lineLimiterIndex + 2);
    console.log(`Error at line "${line}": ${message}`);
  }

  ui.vertexHeader.classList.toggle("has-errors", errors.length > 0);
  ui.vertexHeader.classList.toggle("has-draft", true);
  ui.vertexSaveElt.hidden = errors.length > 0;
}

const fragmentStart = `precision mediump float;
precision mediump int;
#define SHADER_NAME ShaderMaterial
#define GAMMA_FACTOR 2
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
`;
const fragmentStartLength = fragmentStart.split("\n").length;

function checkFragmentShader() {
  const shader = gl.createShader(gl.FRAGMENT_SHADER);
  const shaderCode = replaceShaderChunk(ui.fragmentEditor.codeMirrorInstance.getDoc().getValue());
  gl.shaderSource(shader, `${fragmentStart}\n${shaderCode}`);
  gl.compileShader(shader);
  const log = gl.getShaderInfoLog(shader);

  const errors = log.split("\n");
  if (errors[errors.length - 1] === "") errors.pop();
  for (let error of errors) {
    error = error.replace("ERROR: 0:", "");
    const lineLimiterIndex = error.indexOf(":");
    const line = parseInt(error.slice(0, lineLimiterIndex), 10) - fragmentStartLength;
    const message = error.slice(lineLimiterIndex + 2);
    console.log(`Error at line "${line}": ${message}`);
  }
  ui.fragmentHeader.classList.toggle("has-errors", errors.length > 0);
  ui.fragmentHeader.classList.toggle("has-draft", true);
  ui.fragmentSaveElt.hidden = errors.length > 0;
}
