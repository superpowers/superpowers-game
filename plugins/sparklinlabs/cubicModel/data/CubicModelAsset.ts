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

    async.series<Error>([

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
