/// <reference path="../../textEditorWidget/operational-transform.d.ts" />

import * as OT from "operational-transform";
import * as fs from "fs";
import * as path from "path";
import * as async from "async";
import * as _ from "lodash";

import Uniforms, { UniformPub } from "./Uniforms";
import Attributes, { AttributePub } from "./Attributes";

interface ShaderCode {
  text: string;
  draft: string
  revisionId: number;
}

export interface ShaderAssetPub {
  formatVersion: number;
  uniforms: UniformPub[];
  useLightUniforms: boolean;
  attributes: AttributePub[];
  vertexShader: ShaderCode;
  fragmentShader: ShaderCode;
}

export default class ShaderAsset extends SupCore.data.base.Asset {
  static currentFormatVersion = 1;

  static schema: SupCore.data.base.Schema = {
    formatVersion: { type: "integer" },

    uniforms: { type: "array" },
    useLightUniforms: { type: "boolean", mutable: true },
    attributes: { type: "array" },
    vertexShader: {
      type: "hash",
      properties: {
        text: { type: "string" },
        draft: { type: "string" },
        revisionId: { type: "integer" }
      }
    },
    fragmentShader: {
      type: "hash",
      properties: {
        text: { type: "string" },
        draft: { type: "string" },
        revisionId: { type: "integer" }
      }
    }
  }

  uniforms: Uniforms;
  attributes: Attributes;
  vertexDocument: OT.Document;
  fragmentDocument: OT.Document;
  pub: ShaderAssetPub;

  constructor(id: string, pub: ShaderAssetPub, serverData: any) {
    super(id, pub, ShaderAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.serverData.resources.acquire("textEditorSettings", null, (err: Error, textEditorSettings: any) => {
      this.serverData.resources.release("textEditorSettings", null);

      let tab: string;
      if (textEditorSettings.pub.softTab) {
        tab = "";
        for (let i = 0; i < textEditorSettings.pub.tabSize; i++) tab = tab + " ";
      } else tab = "\t";

      let defaultVertexContent =
`varying vec2 vUv;

void main() {
${tab}vUv = uv;
${tab}gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}
`;
      let defaultFragmentContent =
`uniform sampler2D map;
varying vec2 vUv;

void main() {
${tab}gl_FragColor = texture2D(map, vUv);
}
`
      this.pub = {
        formatVersion: ShaderAsset.currentFormatVersion,

        uniforms: [{ id: "0", name: "map", type: "t", value: "map" }],
        useLightUniforms: false,
        attributes: [],
        vertexShader: {
          text: defaultVertexContent,
          draft: defaultVertexContent,
          revisionId: 0
        },
      fragmentShader: {
          text: defaultFragmentContent,
          draft: defaultFragmentContent,
          revisionId: 0
        }
      };
      super.init(options, callback);
    });
  }

  setup() {
    this.uniforms = new Uniforms(this.pub.uniforms);
    this.attributes = new Attributes(this.pub.attributes);
    this.vertexDocument = new OT.Document(this.pub.vertexShader.draft, this.pub.vertexShader.revisionId);
    this.fragmentDocument = new OT.Document(this.pub.fragmentShader.draft, this.pub.fragmentShader.revisionId);
  }

  load(assetPath: string) {
    let pub: ShaderAssetPub;

    let loadShaders = () => {
      // NOTE: Migration for Superpowers 0.10
      if (typeof pub.vertexShader === "string") {
        pub.vertexShader = {
          text: <any>pub.vertexShader,
          draft: <any>pub.vertexShader,
          revisionId: 0
        }
        pub.fragmentShader = {
          text: <any>pub.fragmentShader,
          draft: <any>pub.fragmentShader,
          revisionId: 0
        }
        this._onLoaded(assetPath, pub);
        return;
      }

      pub.vertexShader = { text: null, draft: null, revisionId: 0 };
      pub.fragmentShader = { text: null, draft: null, revisionId: 0 };

      // TODO: Rename to .glsl instead of .txt
      async.series([
        (cb: (err: Error) => any) => {
          fs.readFile(path.join(assetPath, "vertexShader.txt"), { encoding: "utf8" }, (err, text) => {
            pub.vertexShader.text = text;
            cb(null);
          });
        },
        (cb: (err: Error) => any) => {
          fs.readFile(path.join(assetPath, "vertexShaderDraft.txt"), { encoding: "utf8" }, (err, draft) => {
            pub.vertexShader.draft = (draft != null) ? draft : pub.vertexShader.text;
            cb(null);
          });
        },
        (cb: (err: Error) => any) => {
          fs.readFile(path.join(assetPath, "fragmentShader.txt"), { encoding: "utf8" }, (err, text) => {
            pub.fragmentShader.text = text;
            cb(null);
          });
        },
        (cb: (err: Error) => any) => {
          fs.readFile(path.join(assetPath, "fragmentShaderDraft.txt"), { encoding: "utf8" }, (err, draft) => {
            pub.fragmentShader.draft = (draft != null) ? draft : pub.fragmentShader.text;
            this._onLoaded(assetPath, pub);
          });
        }
      ]);
    }

    fs.readFile(path.join(assetPath, "shader.json"), { encoding: "utf8" }, (err, json) => {
      // NOTE: "asset.json" was renamed to "shader.json" in Superpowers 0.11
      if (err != null && err.code === "ENOENT") {
        fs.readFile(path.join(assetPath, "asset.json"), { encoding: "utf8" }, (err, json) => {
          fs.rename(path.join(assetPath, "asset.json"), path.join(assetPath, "shader.json"), (err) => {
            pub = JSON.parse(json);
            loadShaders();
          });
        });
      } else {
        pub = JSON.parse(json);
        loadShaders();
      }
    });
  }

  migrate(assetPath: string, pub: ShaderAssetPub, callback: (hasMigrated: boolean) => void) {
    if (pub.formatVersion === ShaderAsset.currentFormatVersion) { callback(false); return; }

    if (pub.formatVersion == null) {
      // NOTE: Introduced in Superpowers 0.11
      if (pub.useLightUniforms == null) pub.useLightUniforms = false;

      pub.formatVersion = 1;
    }

    callback(true);
  }

  save(assetPath: string, callback: (err: Error) => any) {
    // NOTE: Doing a clone here because of asynchronous operations below
    // We should use the (future) asset locking system instead
    let vertexShader = _.cloneDeep(this.pub.vertexShader);
    delete this.pub.vertexShader;
    let fragmentShader = _.cloneDeep(this.pub.fragmentShader);
    delete this.pub.fragmentShader;

    let json = JSON.stringify(this.pub, null, 2);

    this.pub.vertexShader = vertexShader;
    this.pub.fragmentShader = fragmentShader;

    // TODO: Rename to .glsl instead of .txt
    async.series([
      (cb: (err: Error) => any) => {
        fs.writeFile(path.join(assetPath, "shader.json"), json, { encoding: "utf8" }, (err) => {
          if (err != null) cb(err);
          else cb(null);
        });
      },
      (cb: (err: Error) => any) => {
        fs.writeFile(path.join(assetPath, "vertexShader.txt"), vertexShader.text, { encoding: "utf8" }, (err) => {
          if (err != null) cb(err);
          else cb(null);
        });
      },
      (cb: (err: Error) => any) => {
        if (vertexShader.draft !== vertexShader.text) {
          fs.writeFile(path.join(assetPath, "vertexShaderDraft.txt"), vertexShader.draft, { encoding: "utf8" }, (err) => {
            if (err != null && err.code !== "ENOENT") cb(err);
            else cb(null);
          });
        } else {
          fs.unlink(path.join(assetPath, "vertexShaderDraft.txt"), (err) => {
            if (err != null && err.code !== "ENOENT") cb(err);
            else cb(null);
          });
        }
      },
      (cb: (err: Error) => any) => {
        fs.writeFile(path.join(assetPath, "fragmentShader.txt"), fragmentShader.text, { encoding: "utf8" }, (err) => {
          if (err != null) cb(err);
          else cb(null);
        });
      },
      (cb: (err: Error) => any) => {
        if (fragmentShader.draft !== fragmentShader.text) {
          fs.writeFile(path.join(assetPath, "fragmentShaderDraft.txt"), fragmentShader.draft, { encoding: "utf8" }, (err) => {
            if (err != null && err.code !== "ENOENT") cb(err);
            else cb(null);
          });
        } else {
          fs.unlink(path.join(assetPath, "fragmentShaderDraft.txt"), (err) => {
            if (err != null && err.code !== "ENOENT") cb(err);
            else cb(null);
          });
        }
      }
    ], (err: Error) => { callback(err); });
  }

  server_newUniform(client: any, name: string, callback: (err: string, uniform: UniformPub, actualIndex: number) => any) {
    for (let uniform of this.pub.uniforms) {
      if (uniform.name === name) {
        callback(`An uniform named ${name} already exists`, null, null);
        return;
      }
    }

    let uniform: UniformPub = { id: null, name, type: "f", value: "0.0" }
    this.uniforms.add(uniform, null, (err, actualIndex) => {
      if (err != null) { callback(err, null, null); return }

      callback(null, uniform, actualIndex);
      this.emit("change");
    });
  }

  client_newUniform(uniform: UniformPub, actualIndex: number) {
    this.uniforms.client_add(uniform, actualIndex);
  }

  server_deleteUniform(client: any, id: string, callback: (err: string, id?: string) => any) {
    this.uniforms.remove(id, (err) => {
      if (err != null) { callback(err); return; }

      callback(null, id);
      this.emit("change");
    });
  }

  client_deleteUniform(id: string) {
    this.uniforms.client_remove(id);
    return
  }

  server_setUniformProperty(client: any, id: string, key: string, value: any, callback: (err: string, id?: string, key?: string, actualValue?: any) => any) {
    if (key === "name") {
      if (typeof(value) !== "string") { callback("Invalid value"); return; }
      value = value.trim();

      if (SupCore.data.hasDuplicateName(id, value, this.uniforms.pub)) {
        callback("There's already an uniform with this name");
        return;
      }
    }

    this.uniforms.setProperty(id, key, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, id, key, actualValue);
      this.emit("change");
    });
  }

  client_setUniformProperty(id: string, key: string, actualValue: any) {
    this.uniforms.client_setProperty(id, key, actualValue);
  }

  server_newAttribute(client: any, name: string, callback: (err: string, attribute: AttributePub, actualIndex: number) => any) {
    for (let attribute of this.pub.attributes) {
      if (attribute.name === name) {
        callback(`An attribute named ${name} already exists`, null, null);
        return;
      }
    }

    let attribute: AttributePub = { id: null, name, type: "f" }
    this.attributes.add(attribute, null, (err, actualIndex) => {
      if (err != null) { callback(err, null, null); return }

      callback(null, attribute, actualIndex);
      this.emit("change");
    });
  }

  client_newAttribute(attribute: AttributePub, actualIndex: number) {
    this.attributes.client_add(attribute, actualIndex);
  }

  server_deleteAttribute(client: any, id: string, callback: (err: string, id?: string) => any) {
    this.attributes.remove(id, (err) => {
      if (err != null) { callback(err); return; }

      callback(null, id);
      this.emit("change");
    });
  }

  client_deleteAttribute(id: string) {
    this.attributes.client_remove(id);
    return
  }

  server_setAttributeProperty(client: any, id: string, key: string, value: any, callback: (err: string, id?: string, key?: string, actualValue?: any) => any) {
    if (key === "name") {
      if (typeof(value) !== "string") { callback("Invalid value"); return; }
      value = value.trim();

      if (SupCore.data.hasDuplicateName(id, value, this.attributes.pub)) {
        callback("There's already an attribute with this name");
        return;
      }
    }

    this.attributes.setProperty(id, key, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, id, key, actualValue);
      this.emit("change");
    });
  }

  client_setAttributeProperty(id: string, key: string, actualValue: any) {
    this.attributes.client_setProperty(id, key, actualValue);
  }

  server_editVertexShader(client: any, operationData: OperationData, revisionIndex: number, callback: (err: string, operationData?: any, revisionIndex?: number) => any) {
    if (operationData.userId !== client.id) { callback("Invalid client id"); return; }

    let operation = new OT.TextOperation();
    if (! operation.deserialize(operationData)) { callback("Invalid operation data"); return; }

    try { operation = this.vertexDocument.apply(operation, revisionIndex); }
    catch (err) { callback("Operation can't be applied"); return; }

    this.pub.vertexShader.draft = this.vertexDocument.text;
    this.pub.vertexShader.revisionId++;

    callback(null, operation.serialize(), this.vertexDocument.getRevisionId() - 1);
    this.emit("change");
  }

  client_editVertexShader(operationData: OperationData, revisionIndex: number) {
    let operation = new OT.TextOperation();
    operation.deserialize(operationData);
    this.vertexDocument.apply(operation, revisionIndex);
    this.pub.vertexShader.draft = this.vertexDocument.text;
    this.pub.vertexShader.revisionId++;
  }

  server_saveVertexShader(client: any, callback: (err: string) => any) {
    this.pub.vertexShader.text = this.pub.vertexShader.draft;
    callback(null);
    this.emit("change");
  }

  client_saveVertexShader() {
    this.pub.vertexShader.text = this.pub.vertexShader.draft;
  }

  server_editFragmentShader(client: any, operationData: OperationData, revisionIndex: number, callback: (err: string, operationData?: any, revisionIndex?: number) => any) {
    if (operationData.userId !== client.id) { callback("Invalid client id"); return; }

    let operation = new OT.TextOperation();
    if (! operation.deserialize(operationData)) { callback("Invalid operation data"); return; }

    try { operation = this.fragmentDocument.apply(operation, revisionIndex); }
    catch (err) { callback("Operation can't be applied"); return; }

    this.pub.fragmentShader.draft = this.fragmentDocument.text;
    this.pub.fragmentShader.revisionId++;

    callback(null, operation.serialize(), this.fragmentDocument.getRevisionId() - 1);
    this.emit("change");
  }

  client_editFragmentShader(operationData: OperationData, revisionIndex: number) {
    let operation = new OT.TextOperation();
    operation.deserialize(operationData);
    this.fragmentDocument.apply(operation, revisionIndex);
    this.pub.fragmentShader.draft = this.fragmentDocument.text;
    this.pub.fragmentShader.revisionId++;
  }

  server_saveFragmentShader(client: any, callback: (err: string) => any) {
    this.pub.fragmentShader.text = this.pub.fragmentShader.draft;
    callback(null);
    this.emit("change");
  }

  client_saveFragmentShader() {
    this.pub.fragmentShader.text = this.pub.fragmentShader.draft;
  }
}
