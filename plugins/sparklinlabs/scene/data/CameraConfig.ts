export default class CameraConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
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
    }
  };

  static create() {
    return {
      mode: "perspective",
      fov: 45,
      orthographicScale: 10,
      viewport: { x: 0, y: 0, width: 1, height: 1 },
    };
  };

  constructor(pub: any) {
    super(pub, CameraConfig.schema);
  }
}
