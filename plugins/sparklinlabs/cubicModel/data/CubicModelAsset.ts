let serverRequire = require;
let THREE: typeof SupEngine.THREE;
// NOTE: It is important that we require THREE through SupEngine
// so that we inherit any settings, like the global Euler order
// (or, alternatively, we could duplicate those settings...)
if ((<any>global).window == null) THREE = serverRequire("../../../../SupEngine").THREE;
else if ((<any>window).SupEngine != null) THREE = SupEngine.THREE;

import * as path from "path";
import * as fs from "fs";
import * as async from "async";
import * as _ from "lodash";

import CubicModelNodes, { Node, getShapeTextureSize } from "./CubicModelNodes";

export interface CubicModelAssetPub {
  pixelsPerUnit: number;
  nodes: Node[];

  textureWidth: number;
  textureHeight: number;
  textures?: { [name: string]: THREE.Texture; };
  maps: { [name: string]: ArrayBuffer; };
  mapSlots: { [name: string]: string; };
}

export interface DuplicatedNode {
  node: Node;
  parentId: string;
  index: number;
}

export interface TextureEdit {
  x: number; y: number;
  value: { r: number; g: number; b: number; a: number; };
}

export default class CubicModelAsset extends SupCore.Data.Base.Asset {

  static schema: SupCore.Data.Base.Schema = {
    pixelsPerUnit: { type: "integer", min: 1, mutable: true },
    nodes: { type: "array" },

    textureWidth: { type: "number" },
    textureHeight: { type: "number" },

    maps: { type: "hash", values: { type: "buffer?" } },
    mapSlots: {
      type: "hash",
      properties: {
        map: { type: "string?", mutable: true },
        light: { type: "string?", mutable: true },
        specular: { type: "string?", mutable: true },
        alpha: { type: "string?", mutable: true },
        normal: { type: "string?", mutable: true }
      }
    }
  };

  static validTextureSizes = [32, 64, 128, 256, 512, 1024, 2048];

  pub: CubicModelAssetPub;
  nodes: CubicModelNodes;

  textureDatas: { [name: string]: Uint8ClampedArray; };

  // Only used on client-side
  clientTextureDatas: { [name: string]: { imageData: ImageData; ctx: CanvasRenderingContext2D; } } = {};

  constructor(id: string, pub: any, server: ProjectServer) {
    super(id, pub, CubicModelAsset.schema, server);
  }

  init(options: any, callback: Function) {
    this.server.data.resources.acquire("cubicModelSettings", null, (err: Error, cubicModelSettings: any) => {
      this.pub = {
        pixelsPerUnit: cubicModelSettings.pub.pixelsPerUnit,
        nodes: [],
        textureWidth: 128,
        textureHeight: 128,
        maps: { map: new ArrayBuffer(128 * 128 * 4) },
        mapSlots: {
          map: "map",
          light: null,
          specular: null,
          alpha: null,
          normal: null
        }
      };

      let data = new Uint8ClampedArray(this.pub.maps["map"]);
      for (let i = 0; i < data.length; i++) data[i] = 255;

      super.init(options, callback);
    });
  }

  setup() {
    this.nodes = new CubicModelNodes(this);

    this.textureDatas = {};
    for (let mapName in this.pub.maps) {
      this.textureDatas[mapName] = new Uint8ClampedArray(this.pub.maps[mapName]);
    }
  }

  load(assetPath: string) {
    fs.readFile(path.join(assetPath, "cubicModel.json"), { encoding: "utf8" }, (err, json) => {
      let pub: CubicModelAssetPub = JSON.parse(json);

      let mapNames: string[] = <any>pub.maps;
      pub.maps = {};

      async.each(mapNames, (mapName, cb) => {
        // TODO: Replace this with a PNG disk format
        fs.readFile(path.join(assetPath, `map-${mapName}.dat`), (err, data) => {
          if (err) { cb(err); return; }

          pub.maps[mapName] = new Uint8ClampedArray(data).buffer;
          cb();
        });
      }, (err) => {
        if (err) throw err;
        this._onLoaded(assetPath, pub);
      });
    });
  }

  client_load() { this._loadTextures(); }
  client_unload() { this._unloadTextures(); }

  save(assetPath: string, saveCallback: (err: Error) => void) {
    let maps = this.pub.maps;

    (<any>this.pub).maps = [];
    for (let key in maps) {
      if (maps[key] != null) (<any>this.pub).maps.push(key);
    }

    let json = JSON.stringify(this.pub, null, 2);
    this.pub.maps = maps;

    fs.writeFile(path.join(assetPath, "cubicModel.json"), json, { encoding: "utf8" }, (err) => {
      if (err) { saveCallback(err); return; }

      async.each(Object.keys(maps), (mapName, cb) => {
        let map = new Buffer(new Uint8ClampedArray(maps[mapName]));

        if (map == null) {
          fs.unlink(path.join(assetPath, `map-${mapName}.dat`), (err) => {
            if (err != null && err.code !== "ENOENT") { cb(err); return; }
            cb();
          });
          return;
        }

        fs.writeFile(path.join(assetPath, `map-${mapName}.dat`), map, cb);
      }, saveCallback);
    });
  }

  _unloadTextures() {
    for (let textureName in this.pub.textures) this.pub.textures[textureName].dispose();
  }

  _loadTextures() {
    this._unloadTextures();
    this.pub.textures = {};
    this.clientTextureDatas = {};

    // Texturing
    // NOTE: This is the unoptimized variant for editing
    // There should be an option you can pass to setModel to ask for editable version vs (default) optimized
    for (let mapName in this.pub.maps) {
      let canvas = document.createElement("canvas");
      canvas.width = this.pub.textureWidth;
      canvas.height = this.pub.textureHeight;
      let ctx = canvas.getContext("2d");
      let texture = this.pub.textures[mapName] = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;

      let imageData = new ImageData(this.textureDatas[mapName], this.pub.textureWidth, this.pub.textureHeight)
      ctx.putImageData(imageData, 0, 0);
      this.clientTextureDatas[mapName] = { imageData, ctx };
    }
  }

  // Nodes
  server_addNode(client: any, name: string, options: any, callback: (err: string, node: Node, parentId: string, index: number) => any) {
    let parentId = (options != null) ? options.parentId : null;
    let parentNode = this.nodes.byId[parentId];

    let node: Node = {
      id: null, name: name, children: [],
      position: (options != null && options.transform != null && options.transform.position != null) ? options.transform.position : { x: 0, y: 0, z: 0 },
      orientation: (options != null && options.transform != null && options.transform.orientation != null) ? options.transform.orientation : { x: 0, y: 0, z: 0, w: 1 },
      shape: (options != null && options.shape != null) ? options.shape : { type: "none", offset: { x: 0, y: 0, z: 0 }, textureOffset: { x: 0, y: 0 }, settings: null }
    };

    if (node.shape.type !== "none") {
      node.shape.textureOffset = { x: 0, y: 0 };
      let placed = false;
      let size = getShapeTextureSize(node.shape);

      for (let j = 0; j < this.pub.textureHeight - size.height; j++) {
        for (let i = 0; i < this.pub.textureWidth; i++) {
          let pushed: boolean;
          do {
            pushed = false;
            for (let otherNodeId in this.nodes.byId) {
              let otherNode = this.nodes.byId[otherNodeId];
              if (otherNode.shape.type === "none") continue;

              let otherSize = getShapeTextureSize(otherNode.shape);
              let otherOffset = otherNode.shape.textureOffset;
              // + 1 and - 1 because we need a one-pixel border
              // to avoid filtering issues
              if ((i + size.width >= otherOffset.x - 1) && (j + size.height >= otherOffset.y - 1) &&
              (i <= otherOffset.x + otherSize.width + 1) && (j <= otherOffset.y + otherSize.height + 1)) {
                i = otherOffset.x + otherSize.width + 2;
                pushed = true;
                break;
              }
            }
          } while(pushed);

          if (i < this.pub.textureWidth && i + size.width < this.pub.textureWidth) {
            node.shape.textureOffset.x = i;
            node.shape.textureOffset.y = j;
            placed = true;
            break;
          }
        }
        if (placed) break;
      }

      if (!placed)
        console.log("Could not find any room for the node's texture. Texture needs to be expanded and all blocks should be re-laid out from bigger to smaller!");
    }

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

  server_moveNodePivot(client: any, id: string, value: { x: number; y: number; z: number; }, callback: (err: string, id: string, value: { x: number; y: number; z: number; }) => any) {
    let node = this.nodes.byId[id];
    let oldMatrix = (node != null) ? this.computeGlobalMatrix(node) : null;

    this.nodes.setProperty(id, "position", value, (err, actualValue) => {
      if (err != null) { callback(err, null, null); return; }

      let newInverseMatrix = this.computeGlobalMatrix(node);
      newInverseMatrix.getInverse(newInverseMatrix);

      let offset = new THREE.Vector3(node.shape.offset.x, node.shape.offset.y, node.shape.offset.z);
      offset.applyMatrix4(oldMatrix).applyMatrix4(newInverseMatrix);
      node.shape.offset.x = offset.x;
      node.shape.offset.y = offset.y;
      node.shape.offset.z = offset.z;

      callback(null, id, actualValue);
      this.emit("change");
    });
  }

  client_moveNodePivot(id: string, value: { x: number; y: number; z: number; }) {
    let node = this.nodes.byId[id];
    let oldMatrix = (node != null) ? this.computeGlobalMatrix(node) : null;

    this.nodes.client_setProperty(id, "position", value);

    let newInverseMatrix = this.computeGlobalMatrix(node);
    newInverseMatrix.getInverse(newInverseMatrix);

    let offset = new THREE.Vector3(node.shape.offset.x, node.shape.offset.y, node.shape.offset.z);
    offset.applyMatrix4(oldMatrix).applyMatrix4(newInverseMatrix);
    node.shape.offset.x = offset.x;
    node.shape.offset.y = offset.y;
    node.shape.offset.z = offset.z;
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

  computeGlobalMatrix(node: Node, includeShapeOffset=false) {
    let defaultScale = new THREE.Vector3(1, 1, 1);
    let matrix = new THREE.Matrix4().compose(<THREE.Vector3>node.position, <THREE.Quaternion>node.orientation, defaultScale);

    let parentNode = this.nodes.parentNodesById[node.id];
    let parentMatrix = new THREE.Matrix4();
    let parentPosition  = new THREE.Vector3();
    let parentOffset = new THREE.Vector3();
    while (parentNode != null) {
      parentPosition.set(parentNode.position.x,parentNode.position.y,parentNode.position.z);
      parentOffset.set(parentNode.shape.offset.x, parentNode.shape.offset.y, parentNode.shape.offset.z);
      parentOffset.applyQuaternion(<THREE.Quaternion>parentNode.orientation);
      parentPosition.add(parentOffset);
      parentMatrix.identity().compose(parentPosition, <THREE.Quaternion>parentNode.orientation, defaultScale);
      matrix.multiplyMatrices(parentMatrix, matrix);
      parentNode = this.nodes.parentNodesById[parentNode.id];
    }
    return matrix;
  }

  applyGlobalMatrix(node: Node, matrix: THREE.Matrix4) {
    let parentGlobalMatrix = new THREE.Matrix4();

    let parentNode = this.nodes.parentNodesById[node.id];
    let parentMatrix = new THREE.Matrix4();
    let defaultScale = new THREE.Vector3(1, 1, 1);
    let parentPosition  = new THREE.Vector3();
    let parentOffset = new THREE.Vector3();
    while (parentNode != null) {
      parentPosition.set(parentNode.position.x,parentNode.position.y,parentNode.position.z);
      parentOffset.set(parentNode.shape.offset.x, parentNode.shape.offset.y, parentNode.shape.offset.z);
      parentOffset.applyQuaternion(<THREE.Quaternion>parentNode.orientation);
      parentPosition.add(parentOffset);
      parentMatrix.identity().compose(parentPosition, <THREE.Quaternion>parentNode.orientation, defaultScale);
      parentGlobalMatrix.multiplyMatrices(parentMatrix, parentGlobalMatrix);
      parentNode = this.nodes.parentNodesById[parentNode.id];
    }

    matrix.multiplyMatrices(parentGlobalMatrix.getInverse(parentGlobalMatrix), matrix);

    let position = new THREE.Vector3();
    let orientation = new THREE.Quaternion();
    matrix.decompose(position, orientation, defaultScale);
    node.position.x = position.x;
    node.position.y = position.y;
    node.position.z = position.z;
    node.orientation.x = orientation.x;
    node.orientation.y = orientation.y;
    node.orientation.z = orientation.z;
    node.orientation.w = orientation.w;
  }

  client_moveNode(id: string, parentId: string, index: number) {
    let node = this.nodes.byId[id];
    let globalMatrix = this.computeGlobalMatrix(node);
    this.nodes.client_move(id, parentId, index);
    this.applyGlobalMatrix(node, globalMatrix);
  }


  server_duplicateNode(client: any, newName: string, id: string, index: number, callback: (err: string, rootNode: Node, newNodes: DuplicatedNode[]) => any) {
    let referenceNode = this.nodes.byId[id];
    if (referenceNode == null) { callback(`Invalid node id: ${id}`, null, null); return; }

    let newNodes: DuplicatedNode[] = [];
    let totalNodeCount = 0
    let walk = (node: Node) => {
      totalNodeCount += 1
      for (let childNode of node.children) walk(childNode);
    };
    walk(referenceNode);

    let rootNode: Node = {
      id: null, name: newName, children: [],
      position: _.cloneDeep(referenceNode.position),
      orientation: _.cloneDeep(referenceNode.orientation),
      shape: _.cloneDeep(referenceNode.shape)
    };
    let parentId = (this.nodes.parentNodesById[id] != null) ? this.nodes.parentNodesById[id].id : null;

    let addNode = (newNode: Node, parentId: string, index: number, children: Node[]) => {
      this.nodes.add(newNode, parentId, index, (err, actualIndex) => {
        if (err != null) { callback(err, null, null); return; }

        // TODO: Copy shape

        newNodes.push({ node: newNode, parentId, index: actualIndex });

        if (newNodes.length === totalNodeCount) {
          callback(null, rootNode, newNodes);
          this.emit("change");
        }

        for (let childIndex = 0; childIndex < children.length; childIndex++) {
          let childNode = children[childIndex];
          let node: Node = {
            id: null, name: childNode.name, children: [],
            position: _.cloneDeep(childNode.position),
            orientation: _.cloneDeep(childNode.orientation),
            shape: _.cloneDeep(childNode.shape)
          };
          addNode(node, newNode.id, childIndex, childNode.children);
        }
      });
    }
    addNode(rootNode, parentId, index, referenceNode.children);
  }

  client_duplicateNode(rootNode: Node, newNodes: DuplicatedNode[]) {
    for (let newNode of newNodes) {
      newNode.node.children.length = 0;
      this.nodes.client_add(newNode.node, newNode.parentId, newNode.index);
    }
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


  // Texture
  server_changeTextureWidth(client: any, newWidth: number, callback: (err: string, newWidth: number) => void) {
    if (CubicModelAsset.validTextureSizes.indexOf(newWidth) === -1) { callback(`Invalid new texture width: ${newWidth}`, null); return; }

    this._changeTextureWidth(newWidth);
    callback(null, newWidth);
    this.emit("change");
  }

  client_changeTextureWidth(newWidth: number) {
    this._changeTextureWidth(newWidth);
    this._loadTextures();
  }

  _changeTextureWidth(newWidth: number) {
    for (let mapName in this.pub.maps) {
      let oldMapData = this.textureDatas[mapName];

      let newMapBuffer = new ArrayBuffer(newWidth * this.pub.textureHeight * 4);
      let newMapData = new Uint8ClampedArray(newMapBuffer);

      for (let y = 0; y < this.pub.textureHeight; y++) {
        let x = 0;
        while (x < Math.max(this.pub.textureWidth, newWidth)) {
          let oldIndex = (y * this.pub.textureWidth + x) * 4;
          let newIndex = (y * newWidth              + x) * 4;

          for (let i = 0; i < 4; i++) {
            let value = x >= this.pub.textureWidth ? 255 : oldMapData[oldIndex + i];
            newMapData[newIndex + i] = value;
          }
          x++;
        }
      }

      this.pub.maps[mapName] = newMapBuffer;
      this.textureDatas[mapName] = newMapData;
    }
    this.pub.textureWidth = newWidth;
  }

  server_changeTextureHeight(client: any, newHeight: number, callback: (err: string, newHeight: number) => void) {
    if (CubicModelAsset.validTextureSizes.indexOf(newHeight) === -1) { callback(`Invalid new texture height: ${newHeight}`, null); return; }

    this._changeTextureHeight(newHeight);
    callback(null, newHeight);
    this.emit("change");
  }

  client_changeTextureHeight(newHeight: number) {
    this._changeTextureHeight(newHeight);
    this._loadTextures();
  }

  _changeTextureHeight(newHeight: number) {
    for (let mapName in this.pub.maps) {
      let oldMapData = this.textureDatas[mapName];

      let newMapBuffer = new ArrayBuffer(this.pub.textureWidth * newHeight * 4);
      let newMapData = new Uint8ClampedArray(newMapBuffer);

      for (let y = 0; y < Math.max(this.pub.textureHeight, newHeight); y++) {
        for (let x = 0; x < this.pub.textureWidth; x++) {
          let index = (y * this.pub.textureWidth + x) * 4;
          for (let i = 0; i < 4; i++) {
            let value = y >= this.pub.textureHeight ? 255 : oldMapData[index + i];
            newMapData[index + i] = value;
          }
        }
      }

      this.pub.maps[mapName] = newMapBuffer;
      this.textureDatas[mapName] = newMapData;
    }
    this.pub.textureHeight = newHeight;
  }

  server_editTexture(client: any, name: string, edits: TextureEdit[], callback: (err: string, name: string, edits: TextureEdit[]) => void) {
    if (this.pub.maps[name] == null) { callback(`Invalid map name: ${name}`, null, null); return; }
    for (let edit of edits) {
      if (edit.x == null || edit.x < 0 || edit.x >= this.pub.textureWidth) { callback(`Invalid edit x: ${edit.x}`, null, null); return; }
      if (edit.y == null || edit.y < 0 || edit.y >= this.pub.textureHeight) { callback(`Invalid edit y: ${edit.y}`, null, null); return; }
      if (edit.value.r == null || edit.value.r < 0 || edit.value.r > 255) { callback(`Invalid edit value r: ${edit.value.r}`, null, null); return; }
      if (edit.value.g == null || edit.value.g < 0 || edit.value.g > 255) { callback(`Invalid edit value g: ${edit.value.g}`, null, null); return; }
      if (edit.value.b == null || edit.value.b < 0 || edit.value.b > 255) { callback(`Invalid edit value b: ${edit.value.b}`, null, null); return; }
      if (edit.value.a == null || edit.value.a < 0 || edit.value.a > 255) { callback(`Invalid edit value a: ${edit.value.a}`, null, null); return; }
    }

    this._editTextureData(name, edits);

    callback(null, name, edits);
    this.emit("change");
  }

  client_editTexture(name: string, edits: TextureEdit[]) {
    this._editTextureData(name, edits);

    let imageData = this.clientTextureDatas[name].imageData;
    this.clientTextureDatas[name].ctx.putImageData(imageData, 0, 0);
    this.pub.textures[name].needsUpdate = true;
  }

  _editTextureData(name: string, edits: TextureEdit[]) {
    let array = this.textureDatas[name];
    for (let edit of edits) {
      let index = edit.y * this.pub.textureWidth + edit.x;
      index *= 4;
      array[index + 0] = edit.value.r;
      array[index + 1] = edit.value.g;
      array[index + 2] = edit.value.b;
      array[index + 3] = edit.value.a;
    }
  }
}
