interface CannonBodyConfigPub {
  formatVersion: number;

  mass: number;
  fixedRotation: boolean;
  offset: { x: number; y: number; z: number; };
  shape: string;
  halfSize: { x: number; y: number; z: number; };
  radius: number;
  height: number;
}

export default class CannonBodyConfig extends SupCore.Data.Base.ComponentConfig {

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

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
    let emptyConfig: CannonBodyConfigPub = {
      formatVersion: CannonBodyConfig.currentFormatVersion,

      mass: 0,
      fixedRotation: false,
      offset: { x: 0, y: 0, z: 0 },
      shape: "box",
      halfSize: { x: 0.5, y: 0.5, z: 0.5 },
      radius: 1,
      height: 1
    };
    return emptyConfig;
  }

  static currentFormatVersion = 1;
  static migrate(pub: CannonBodyConfigPub) {
    if (pub.formatVersion === CannonBodyConfig.currentFormatVersion) return false;

    if (pub.formatVersion == null) {
      pub.formatVersion = 1;

      // NOTE: offset was introduced in Superpowers 0.14
      // to merge offsetX, offsetY and offsetZ
      if ((pub as any).offsetX != null) {
        pub.offset = {
          x: (pub as any).offsetX,
          y: (pub as any).offsetY,
          z: (pub as any).offsetZ,
        };

        delete (pub as any).offsetX;
        delete (pub as any).offsetY;
        delete (pub as any).offsetZ;
      }

      // NOTE: halfSize was introduced in Superpowers 0.14
      // to merge halfWidth, halfHeight and halfDepth
      if ((pub as any).halfWidth != null) {
        pub.halfSize = {
          x: (pub as any).halfWidth,
          y: (pub as any).halfHeight,
          z: (pub as any).halfDepth
        };

        delete (pub as any).halfWidth;
        delete (pub as any).halfHeight;
        delete (pub as any).halfDepth;
      }

      if (pub.shape == null) pub.shape = "box";
      if (pub.radius == null) pub.radius = 1;
      if (pub.height == null) pub.height  = 1;
    }

    return true;
  }

  constructor(pub: any) { super(pub, CannonBodyConfig.schema); }
}
