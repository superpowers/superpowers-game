import SceneComponents, { Component } from "./SceneComponents";

export interface Node extends SupCore.data.base.TreeNode {
  children: Node[];

  components: Component[];
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };
  scale: { x: number; y: number; z: number };
}

export default class SceneNodes extends SupCore.data.base.TreeById {

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

    components: { type: "array?" }
  }

  pub: Node[];
  byId: { [id: string]: Node };
  parentNodesById: { [id: string]: Node };
  componentsByNodeId: { [id: string]: SceneComponents } = {};

  serverData: SupCore.data.ProjectServerData;

  constructor(pub: any, serverData: SupCore.data.ProjectServerData) {
    super(pub, SceneNodes.schema);
    this.serverData = serverData;

    this.walk((node: any, parentNode: any) => {
      if (node.components != null) this.componentsByNodeId[node.id] = new SceneComponents(node.components, this.serverData);
    });
  }

  add(node: Node, parentId: string, index: number, callback: (err: string, actualIndex: number) => any) {
    super.add(node, parentId, index, (err, actualIndex) => {
      if (err != null) { callback(err, null); return; }

      if (node.components != null) {
        let components = new SceneComponents(node.components, this.serverData);
        this.componentsByNodeId[node.id] = components;
        node.components = components.pub;
      }

      callback(null, actualIndex);
    });
  }

  client_add(node: Node, parentId: string, index: number) {
    super.client_add(node, parentId, index);
    if (node.components != null) this.componentsByNodeId[node.id] = new SceneComponents(node.components);
  }

  remove(id: string, callback: (err: string) => any) {
    let node = this.byId[id];
    if (node == null) { callback(`Invalid node id: ${id}`); return; }

    if (node.components != null) {
      this.walkNode(node, null, (node) => {
        for (let componentId in this.componentsByNodeId[node.id].configsById) {
          this.componentsByNodeId[node.id].configsById[componentId].destroy();
        }
        delete this.componentsByNodeId[node.id];
      });
    }

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
}
