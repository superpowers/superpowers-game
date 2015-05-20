import Uniforms, { UniformPub } from "./Uniforms";
import Attributes, { AttributePub } from "./Attributes";

export interface ShaderAssetPub {
  uniforms: UniformPub[];
  attributes: AttributePub[];
  vertexShader: string;
  fragmentShader: string;
}

export default class ShaderAsset extends SupCore.data.base.Asset {
  static schema = {
    uniforms: { type: "array" },
    attributes: { type: "array" },
    vertexShader: { type: "string", mutable: true },
    fragmentShader: { type: "string", mutable: true }
  }

  uniforms: Uniforms;
  attributes: Attributes;
  pub: ShaderAssetPub;

  constructor(id: string, pub: ShaderAssetPub, serverData: any) {
    super(id, pub, ShaderAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.pub = {
      uniforms: [],
      attributes: [],
      vertexShader: "",
      fragmentShader: ""
    };
    super.init(options, callback);
  }

  setup() {
    this.uniforms = new Uniforms(this.pub.uniforms);
    this.attributes = new Attributes(this.pub.attributes);
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
}
