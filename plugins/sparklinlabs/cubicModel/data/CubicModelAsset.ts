let serverRequire = require;
let THREE: any;
// NOTE: It is important that we require THREE through SupEngine
// so that we inherit any settings, like the global Euler order
// (or, alternatively, we could duplicate those settings...)
if ((<any>global).window == null) THREE = serverRequire("../../../../system/SupEngine").THREE;
else if ((<any>window).SupEngine != null) THREE = SupEngine.THREE;

import * as path from "path";
import * as fs from "fs";
import * as async from "async";
import * as _ from "lodash";

import CubicModelNodes, { Node } from "./CubicModelNodes";

interface CubicModelAssetPub {
  unitRatio: number;
  nodes: Node[];
}

export default class CubicModelAsset extends SupCore.data.base.Asset {

  static schema = {
    unitRatio: { type: "integer", min: "1" },
    nodes: { type: "array" },
  };

  pub: CubicModelAssetPub;
  nodes: CubicModelNodes;

  constructor(id: string, pub: any, serverData: any) {
    super(id, pub, CubicModelAsset.schema, serverData);
  }

  init(options: any, callback: Function) {
    this.pub = { unitRatio: 16 /* TODO: get default from settings resource! */, nodes: [] };
    super.init(options, callback);
  }

  setup() {
    this.nodes = new CubicModelNodes(this.pub.nodes, this);
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "cubicModel.json"), { encoding: "utf8" }, (err, json) => {
      let pub: CubicModelAssetPub = JSON.parse(json);

      this.pub = pub;
      this.setup();
      this.emit("load");
    });
  }

  save(assetPath: string, saveCallback: Function) {
    let json = JSON.stringify(this.pub, null, 2);

    async.series([

      (callback) => { fs.writeFile(path.join(assetPath, "cubicModel.json"), json, { encoding: "utf8" }, (err) => { callback(err, null); }); },

    ], (err) => { saveCallback(err); });
  }


  server_addNode(client: any, name: string, options: any, callback: (err: string, node: Node, parentId: string, index: number) => any) {
    let parentId = (options != null) ? options.parentId : null;
    let parentNode = this.nodes.byId[parentId];

    let node: Node = {
      id: null, name: name, children: <Node[]>[],
      position: (options != null && options.transform != null && options.transform.position != null) ? options.transform.position : { x: 0, y: 0, z: 0 },
      orientation: (options != null && options.transform != null && options.transform.orientation != null) ? options.transform.orientation : { x: 0, y: 0, z: 0, w: 1 },
      scale: (options != null && options.transform != null && options.transform.scale != null) ? options.transform.scale : { x: 1, y: 1, z: 1 },
      shape: (options != null && options.shape != null) ? options.shape : { type: "none", offset: { x: 0, y: 0, z: 0 }, settings: null }
    };

    let index = (options != null) ? options.index : null;
    this.nodes.add(node, parentId, index, (err, actualIndex) => {
      if (err != null) { callback(err, null, null, null); return; }

      callback(null, node, parentId, actualIndex);
      this.emit("change");
    });
  }

  client_addNode(node: Node, parentId: string, index: number) {
    this.nodes.client_add(node, parentId, index);
  }


  server_setNodeProperty(client: any, id: string, path: string, value: any, callback: (err: string, id: string, path: string, value: any) => any) {
    this.nodes.setProperty(id, path, value, (err, actualValue) => {
      if (err != null) { callback(err, null, null, null); return; }

      callback(null, id, path, actualValue);
      this.emit("change");
    });
  }

  client_setNodeProperty(id: string, path: string, value: any) {
    this.nodes.client_setProperty(id, path, value);
  }


  server_moveNode(client: any, id: string, parentId: string, index: number, callback: (err: string, id: string, parentId: string, index: number) => any) {
    let node = this.nodes.byId[id];
    if (node == null) { callback(`Invalid node id: ${id}`, null, null, null); return; }

    let globalMatrix = this.computeGlobalMatrix(node);

    this.nodes.move(id, parentId, index, (err, actualIndex) => {
      if (err != null) { callback(err, null, null, null); return; }

      this.applyGlobalMatrix(node, globalMatrix);

      callback(null, id, parentId, actualIndex);
      this.emit("change");
    });
  }

  computeGlobalMatrix(node: Node) {
    let matrix = new THREE.Matrix4().compose(<THREE.Vector3>node.position, <THREE.Quaternion>node.orientation, <THREE.Vector3>node.scale);

    let parentNode = this.nodes.parentNodesById[node.id];
    if (parentNode != null) {
      let parentGlobalMatrix = this.computeGlobalMatrix(parentNode);
      matrix.multiplyMatrices(parentGlobalMatrix, matrix);
    }
    return matrix;
  }

  applyGlobalMatrix(node: Node, matrix: THREE.Matrix4) {
    let parentNode = this.nodes.parentNodesById[node.id];
    if (parentNode != null) {
      let parentGlobalMatrix = this.computeGlobalMatrix(parentNode);
      matrix.multiplyMatrices(new THREE.Matrix4().getInverse(parentGlobalMatrix), matrix);
    }

    let position = new THREE.Vector3();
    let orientation = new THREE.Quaternion();
    let scale = new THREE.Vector3();
    matrix.decompose(position, orientation, scale);
    node.position = { x: position.x, y: position.y, z: position.z };
    node.orientation = { x: orientation.x, y: orientation.y, z: orientation.z, w: orientation.w };
    node.scale = { x: scale.x, y: scale.y, z: scale.z };
  }

  client_moveNode(id: string, parentId: string, index: number) {
    let node = this.nodes.byId[id];
    let globalMatrix = this.computeGlobalMatrix(node);
    this.nodes.client_move(id, parentId, index);
    this.applyGlobalMatrix(node, globalMatrix);
  }


  server_removeNode(client: any, id: string, callback: (err: string, id: string) => any) {
    this.nodes.remove(id, (err) => {
      if (err != null) { callback(err, null); return; }

      callback(null, id);
      this.emit("change");
    });
  }

  client_removeNode(id: string) {
    this.nodes.client_remove(id);
  }
}
