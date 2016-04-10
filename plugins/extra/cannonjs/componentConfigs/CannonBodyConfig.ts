export interface CannonBodyConfigPub {
  formatVersion: number;

  mass: number;
  fixedRotation: boolean;
  group: number;
  mask: number;

  positionOffset: { x: number; y: number; z: number; };
  orientationOffset: { x: number; y: number; z: number; };
  shape: string;
  halfSize: { x: number; y: number; z: number; };
  radius: number;
  height: number;
  segments: number;
}

export default class CannonBodyConfig extends SupCore.Data.Base.ComponentConfig {

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    mass: { type: "number", min: 0, mutable: true },
    fixedRotation: { type: "boolean", mutable: true },
    group: { type: "number", mutable: true },
    mask: { type: "number", mutable: true },

    shape: { type: "enum", items: [ "box", "sphere", "cylinder" ], mutable: true },

    positionOffset: {
      mutable: true,
      type: "hash",
      properties: {
        x: { type: "number", mutable: true },
        y: { type: "number", mutable: true },
        z: { type: "number", mutable: true },
      }
    },
    orientationOffset: {
        mutable: true,
        type: "hash",
        properties: {
            x: { type: "number", mutable: true },
            y: { type: "number", mutable: true },
            z: { type: "number", mutable: true }
        }
    },

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
    height: { type: "number", min: 0, mutable: true },
    segments: { type: "number", min: 3, mutable: true }
  };

  static create() {
    const emptyConfig: CannonBodyConfigPub = {
      formatVersion: CannonBodyConfig.currentFormatVersion,

      mass: 0,
      fixedRotation: false,
      group: 1,
      mask: 1,

      shape: "box",
      positionOffset: { x: 0, y: 0, z: 0 },
      orientationOffset: { x: 0, y: 0, z: 0 },
      halfSize: { x: 0.5, y: 0.5, z: 0.5 },
      radius: 1,
      height: 1,
      segments: 16
    };
    return emptyConfig;
  }

  static currentFormatVersion = 2;
  static migrate(pub: CannonBodyConfigPub) {
    if (pub.formatVersion === CannonBodyConfig.currentFormatVersion) return false;

    if (pub.formatVersion == null) {
      pub.formatVersion = 1;

      if ((pub as any).offsetX != null) {
        pub.positionOffset = {
          x: (pub as any).offsetX,
          y: (pub as any).offsetY,
          z: (pub as any).offsetZ,
        };

        delete (pub as any).offsetX;
        delete (pub as any).offsetY;
        delete (pub as any).offsetZ;
      }

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
    }

    if (pub.formatVersion === 1) {
      if ((pub as any).offset != null) {
        pub.positionOffset = (pub as any).offset;
        delete (pub as any).offset;
      }

      pub.orientationOffset = { x: 0, y: 0, z: 0 };
      pub.segments = 16;
      pub.group = 1;
      pub.mask = 1;
      pub.formatVersion = 2;
    }

    return true;
  }

  constructor(pub: any) { super(pub, CannonBodyConfig.schema); }
}
