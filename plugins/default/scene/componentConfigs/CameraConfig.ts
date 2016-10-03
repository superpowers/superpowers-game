export interface CameraConfigPub {
  formatVersion: number;

  mode: string;
  fov: number;
  orthographicScale: number;
  viewport: { x: number; y: number; width: number; height: number; };
  depth: number;
  nearClippingPlane: number;
  farClippingPlane: number;
}

export default class CameraConfig extends SupCore.Data.Base.ComponentConfig {

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

    mode: { type: "enum", items: [ "perspective", "orthographic" ], mutable: true },
    fov: { type: "number", min: 0.1, max: 179.9, mutable: true },
    orthographicScale: { type: "number", min: 0.1, mutable: true },
    viewport: {
      type: "hash",
      properties: {
        x: { type: "number", min: 0, max: 1, mutable: true },
        y: { type: "number", min: 0, max: 1, mutable: true },
        width: { type: "number", min: 0, max: 1, mutable: true },
        height: { type: "number", min: 0, max: 1, mutable: true },
      }
    },
    depth: { type: "number", mutable: true },
    nearClippingPlane: { type: "number", min: 0.1, mutable: true },
    farClippingPlane: { type: "number", min: 0.1, mutable: true }
  };

  static create() {
    const emptyConfig: CameraConfigPub = {
      formatVersion: CameraConfig.currentFormatVersion,

      mode: "perspective",
      fov: 45,
      orthographicScale: 10,
      viewport: { x: 0, y: 0, width: 1, height: 1 },
      depth: 0,
      nearClippingPlane: 0.1,
      farClippingPlane: 1000
    };
    return emptyConfig;
  };

  static currentFormatVersion = 1;
  static migrate(pub: CameraConfigPub) {
    if (pub.formatVersion === CameraConfig.currentFormatVersion) return false;

    if (pub.formatVersion == null) {
      pub.formatVersion = 1;

      // NOTE: New setting introduced in v0.8
      if (pub.depth == null) pub.depth = 0;
      // NOTE: New settings introduced in v0.7
      if (pub.nearClippingPlane == null) pub.nearClippingPlane = 0.1;
      if (pub.farClippingPlane == null) pub.farClippingPlane = 1000;
    }

    return true;
  }

  pub: CameraConfigPub;
  constructor(pub: CameraConfigPub) { super(pub, CameraConfig.schema); }
}
