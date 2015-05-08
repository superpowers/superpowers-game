export interface LightConfigPub {
  type: string;
  color: string;
  intensity: number;
  distance: number;
  target: {
    x: number;
    y: number;
    z: number;
  };
  castShadow: boolean;
}

export default class LightConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    type: { type: "enum", items: ["ambient", "point", "spot", 'directional'], mutable: true },
    color: { type: "string", mutable: true },
    intensity: { type: "number", min: 0, mutable: true},
    distance: { type: "number", min: 0, mutable: true},
    target: {
      type: "hash",
      properties: {
        x: { type: "number", mutable: true },
        y: { type: "number", mutable: true },
        z: { type: "number", mutable: true }
      }
    },
    castShadow: { type: "boolean", mutable: true},
  }

  static create() {
    let emptyConfig: LightConfigPub = { type: "ambient", color: "ffffff", intensity: 1, distance: 0, target: { x: 0, y: 0, z: 0}, castShadow: false };
    return emptyConfig;
  }

  constructor(pub: any) {
    super(pub, LightConfig.schema);
  }
}
