export default
class CannonBodyConfig extends SupCore.data.base.ComponentConfig {
  static schema = {
    mass: { type: "number", min: 0, mutable: true },
    fixedRotation: { type: "boolean", mutable: true },
    offset: {
      mutable: true,
      type: "hash",
      properties: {
        x: { type: "number", mutable: true },
        y: { type: "number", mutable: true },
        z: { type: "number", mutable: true },
      }
    },

    shape: { type: "enum", items: ["box", "sphere", "cylinder"], mutable: true },

    halfSize: {
      mutable: true,
      type: "hash",
      properties: {
        x: { type: "number", min: 0, mutable: true },
        y: { type: "number", min: 0, mutable: true },
        z: { type: "number", min: 0, mutable: true },
      }
    },

    radius: { type: "number", min: 0, mutable: true },
    height: { type: "number", min: 0, mutable: true }
  };

  static create() {
    return {
      mass: 0,
      fixedRotation: false,
      offset: { x: 0, y: 0, z: 0 },
      shape: "box",
      halfSize: { x: 0.5, y: 0.5, z: 0.5 },
      radius: 1,
      height: 1
    };
  }

  constructor(pub: any) {
    // NOTE: offset was introduced in Superpowers 0.14
    // to merge offsetX, offsetY and offsetZ
    if (pub.offsetX != null) {
      pub.offset = {
        x: pub.offsetX,
        y: pub.offsetY,
        z: pub.offsetZ,
      };

      delete pub.offsetX;
      delete pub.offsetY;
      delete pub.offsetZ;
    }

    // NOTE: halfSize was introduced in Superpowers 0.14
    // to merge halfWidth, halfHeight and halfDepth
    if (pub.halfWidth != null) {
      pub.halfSize = {
        x: pub.halfWidth,
        y: pub.halfHeight,
        z: pub.halfDepth
      };

      delete pub.halfWidth;
      delete pub.halfHeight;
      delete pub.halfDepth;
    }

    if (pub.shape == null) pub.shape = "box";
    if (pub.radius == null) pub.radius = 1;
    if (pub.height == null) pub.height  = 1;

    super(pub, CannonBodyConfig.schema);
  }
}
