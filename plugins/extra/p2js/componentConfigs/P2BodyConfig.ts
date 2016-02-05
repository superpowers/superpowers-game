interface P2BodyConfigPub {
  formatVersion: number;

  mass: number;
  fixedRotation: boolean;
  offsetX: number;
  offsetY: number;
  shape: string;
  width: number;
  height: number;
  radius: number;
  length: number;
}

export default class P2BodyConfig extends SupCore.Data.Base.ComponentConfig {

  static schema: SupCore.Data.Schema = {
    formatVersion: { type: "integer" },

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
    let emptyConfig: P2BodyConfigPub = {
      formatVersion: P2BodyConfig.currentFormatVersion,

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
    return emptyConfig;
  }

  static currentFormatVersion = 1;
  static migrate(pub: P2BodyConfigPub) {
    if (pub.formatVersion === P2BodyConfig.currentFormatVersion) return false;

    if (pub.formatVersion == null) {
      pub.formatVersion = 1;

      // NOTE: "rectangle" was renamed to "box" in p2.js v0.7
      if (pub.shape === "rectangle") pub.shape = "box";
    }

    return true;
  }

  constructor(pub: P2BodyConfigPub) { super(pub, P2BodyConfig.schema); }
}
