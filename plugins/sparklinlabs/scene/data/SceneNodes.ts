import SceneAsset from "./SceneAsset";
import SceneComponents, { Component } from "./SceneComponents";

export interface Node extends SupCore.Data.Base.TreeNode {
  children: Node[];

  components: Component[];
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
  visible: boolean;
  layer: number;
  prefab: {
    sceneAssetId: string;
  }
}

export default class SceneNodes extends SupCore.Data.Base.TreeById {

  static schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    children: { type: "array" },

    position: {
      mutable: true,
      type: "hash",
      properties: {
        x: { type: "number", mutable: true },
        y: { type: "number", mutable: true },
        z: { type: "number", mutable: true },
      }
    },

    orientation: {
      mutable: true,
      type: "hash",
      properties: {
        x: { type: "number", mutable: true },
        y: { type: "number", mutable: true },
        z: { type: "number", mutable: true },
        w: { type: "number", mutable: true },
      }
    },

    scale: {
      mutable: true,
      type: "hash",
      properties: {
        x: { type: "number", mutable: true },
        y: { type: "number", mutable: true },
        z: { type: "number", mutable: true },
      }
    },

    visible: { type: "boolean", mutable: true },
    layer: { type: "integer", min: 0, mutable: true },
    prefab: {
      type: "hash?",
      properties: {
        "sceneAssetId": { type: "string?", mutable: true },
      }
    },

    components: { type: "array?" }
  }

  pub: Node[];
  byId: { [id: string]: Node };
  parentNodesById: { [id: string]: Node };
  componentsByNodeId: { [id: string]: SceneComponents } = {};

  sceneAsset: SceneAsset;

  constructor(pub: any, sceneAsset: SceneAsset) {
    super(pub, SceneNodes.schema);
    this.sceneAsset = sceneAsset;

    this.walk((node: Node, parentNode: Node) => {
      // NOTE: Node visibility and layer were introduced in Superpowers 0.8
      if (typeof node.visible === "undefined") {
        node.visible = true;
        node.layer = 0;
      }
      this.componentsByNodeId[node.id] = new SceneComponents(node.components, this.sceneAsset);
    });
  }

  add(node: Node, parentId: string, index: number, callback: (err: string, actualIndex: number) => any) {
    super.add(node, parentId, index, (err, actualIndex) => {
      if (err != null) { callback(err, null); return; }

      if (node.components != null) {
        let components = new SceneComponents(node.components, this.sceneAsset);
        this.componentsByNodeId[node.id] = components;
        node.components = components.pub;
      }

      callback(null, actualIndex);
    });
  }

  client_add(node: Node, parentId: string, index: number) {
    super.client_add(node, parentId, index);
    if (node.components != null) this.componentsByNodeId[node.id] = new SceneComponents(node.components, this.sceneAsset);
  }

  remove(id: string, callback: (err: string) => any) {
    let node = this.byId[id];
    if (node == null) { callback(`Invalid node id: ${id}`); return; }

    if (node.prefab != null && node.prefab.sceneAssetId != null) this.emit("removeDependencies", [ node.prefab.sceneAssetId ], `${id}_${node.prefab.sceneAssetId}`);

    this.walkNode(node, null, (node) => {
      for (let componentId in this.componentsByNodeId[node.id].configsById) {
        this.componentsByNodeId[node.id].configsById[componentId].destroy();
      }
      delete this.componentsByNodeId[node.id];
    });

    super.remove(id, callback);
  }

  client_remove(id: string) {
    let node = this.byId[id];

    if (node.components != null) {
      this.walkNode(node, null, (node) => {
        for (let componentId in this.componentsByNodeId[node.id].configsById) {
          this.componentsByNodeId[node.id].configsById[componentId].destroy();
        }
        delete this.componentsByNodeId[node.id];
      });
    }

    super.client_remove(id);
  }

  addComponent(id: string, component: any, index: number, callback: (err: string, actualIndex: number) => any) {
    let components = this.componentsByNodeId[id];
    if (components == null) { callback(`Invalid node id: ${id}`, null); return; }

    components.add(component, index, callback);
  }

  client_addComponent(id: string, component: any, index: number) {
    this.componentsByNodeId[id].client_add(component, index);
  }

  setProperty(id: string, key: string, value: any, callback: (err: string, value?: any) => any) {
    let oldDepId: string;

    let finish = () => {
      super.setProperty(id, key, value, (err, actualValue) => {
        if (err != null) { callback(err); return; }

        if (key === "prefab.sceneAssetId") {
          if (oldDepId != null) this.emit("removeDependencies", [ oldDepId ], `${id}_${oldDepId}`);
          if (actualValue != null) this.emit("addDependencies", [ actualValue ], `${id}_${actualValue}`);
        }
        callback(null, actualValue);
      });
    }

    if (key !== "prefab.sceneAssetId") {
      finish();
      return;
    }

    // Ensure prefab is valid
    oldDepId = this.byId[id].prefab != null ? this.byId[id].prefab.sceneAssetId : null;
    if (value == null) {
      finish();
      return;
    }

    if (value === this.sceneAsset.id) {
      callback("A prefab can't reference itself");
      return;
    }

    // Check for infinite loop
    let canUseScene = true;
    let acquiringScene = 0;

    let checkScene = (sceneId: string) => {
      acquiringScene++;
      this.sceneAsset.server.data.assets.acquire(sceneId, this, (error: Error, asset: SceneAsset) => {
        this.sceneAsset.server.data.assets.release(sceneId, this);

        // Check the scene has only one root actor
        if (asset.pub.nodes.length !== 1) {
          callback("A prefab must have only one root actor");
          return;
        }

        let walk = (node: Node) => {
          if (!canUseScene) return;

          if (node.prefab != null && node.prefab.sceneAssetId != null) {
            if (node.prefab.sceneAssetId === this.sceneAsset.id) canUseScene = false;
            else checkScene(node.prefab.sceneAssetId);
          }
          for (let child of node.children) walk(child);
        }

        for (let rootNode of asset.pub.nodes) walk(rootNode);

        acquiringScene--;
        if (acquiringScene === 0) {
          if (canUseScene) finish();
          else callback("Cannot use this scene, it will create an infinite loop");
        }
      });
    }
    checkScene(value);
  }
}
