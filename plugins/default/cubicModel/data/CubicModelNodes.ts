import CubicModelAsset from "./CubicModelAsset";

export interface XYZ { x: number; y: number; z: number; }

export interface Node extends SupCore.Data.Base.TreeNode {
  children: Node[];

  position: XYZ;
  orientation: { x: number; y: number; z: number; w: number };

  shape: Shape;
}

export interface Shape {
  type: string;
  offset: XYZ;
  textureLayoutCustom: boolean;
  textureLayout: { [face: string]: {
    offset: { x: number; y: number; };
    mirror: { x: boolean; y: boolean; };
    angle: number;
  } };
  settings: any;
}

export function getShapeTextureSize(shape: Shape) {
  let width = 0;
  let height = 0;

  switch(shape.type) {
    case "box":
      width = shape.settings.size.x * 2 + shape.settings.size.z * 2;
      height = shape.settings.size.z + shape.settings.size.y;
      break;
  }

  return { width, height };
}

export function getShapeTextureFaceSize(shape: Shape, faceName: string) {
  let width = 0;
  let height = 0;

  switch(shape.type) {
    case "box":
      switch (faceName) {
        case "front":
        case "back":
          width = shape.settings.size.x;
          height = shape.settings.size.y;
          break;
        case "left":
        case "right":
          width = shape.settings.size.z;
          height = shape.settings.size.y;
          break;
        case "top":
        case "bottom":
          width = shape.settings.size.x;
          height = shape.settings.size.z;
          break;
      }
      break;
  }

  return { width, height };
}

export default class CubicModelNodes extends SupCore.Data.Base.TreeById {

  static schema: SupCore.Data.Schema = {
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

    shape: {
      type: "hash",
      properties: {
        type: { type: "string", mutable: true },
        offset: {
          mutable: true,
          type: "hash",
          properties: {
            x: { type: "number", mutable: true },
            y: { type: "number", mutable: true },
            z: { type: "number", mutable: true },
          }
        },
        textureLayoutCustom: { type: "boolean", mutable: true },
        textureLayout: {
          type: "hash",
          values: {
            type: "hash",
            properties: {
              offset: {
                type: "hash",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" }
                }
              },
              mirror: {
                type: "hash",
                properties: {
                  x: { type: "boolean", mutable: true },
                  y: { type: "boolean", mutable: true }
                }
              },
              angle: { type: "number", mutable: true }
            }
          }
        },
        settings: {
          mutable: true,
          type: "any"
        }
      }
    }
  };

  pub: Node[];
  byId: { [id: string]: Node };
  parentNodesById: { [id: string]: Node };
  canvasContextsById: { [id: string]: { [textureName: string]: CanvasRenderingContext2D } };

  cubicModelAsset: CubicModelAsset;

  constructor(cubicModelAsset: CubicModelAsset) {
    super(cubicModelAsset.pub.nodes, CubicModelNodes.schema);
    this.cubicModelAsset = cubicModelAsset;
  }
}
