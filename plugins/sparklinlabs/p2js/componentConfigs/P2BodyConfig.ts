export default class P2BodyConfig extends SupCore.Data.Base.ComponentConfig {
  static schema = {
    mass: { type: "number", min: 0, mutable: true },
    fixedRotation: { type: "boolean", mutable: true },
    offsetX: { type: "number", mutable: true },
    offsetY: { type: "number", mutable: true },
    shape: { type: "enum", items: [ "box", "circle" ], mutable: true },
    width: { type: "number", min: 0, mutable: true },
    height: { type: "number", min: 0, mutable: true },
    radius: { type: "number", min: 0, mutable: true }
  };

  static create() {
    return {
      mass: 0,
      fixedRotation: false,
      offsetX: 0,
      offsetY: 0,
      shape: "box",
      width: 1,
      height: 1,
      radius: 1,
      length: 1
    };
  }

  constructor(pub: any) {
    // NOTE: "rectangle" was renamed to "box" in p2.js v0.7
    if (pub.shape === "rectangle") pub.shape = "box";

    super(pub, P2BodyConfig.schema);
  }
}
