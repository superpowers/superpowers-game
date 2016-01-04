export interface CubicModelRendererConfigPub {
  cubicModelAssetId: string; // animationId: string;
  // horizontalFlip: boolean; verticalFlip: boolean;
  // castShadow: boolean; receiveShadow: boolean;
  // color: string;
  // overrideOpacity: boolean; opacity: number;
  // materialType: string; shaderAssetId: string;
}

export default class CubicModelRendererConfig extends SupCore.Data.Base.ComponentConfig {

  static schema = {
    cubicModelAssetId: { type: "string?", min: 0, mutable: true },
    // animationId: { type: "string?", min: 0, mutable: true },
    // horizontalFlip: { type: "boolean", mutable: true },
    // verticalFlip: { type: "boolean", mutable: true },
    // castShadow: { type: "boolean", mutable: true },
    // receiveShadow: { type: "boolean", mutable: true },
    // color: { type: "string?", length: 6, mutable: true },
    // overrideOpacity: { type: "boolean", mutable: true },
    // opacity: { type: "number?", min: 0, max: 1, mutable: true },
    // materialType: { type: "enum", items: ["basic", "phong", "shader"], mutable: true },
    // shaderAssetId: { type: "string?", min: 0, mutable: true }
  };

  static create() {
    let emptyConfig: CubicModelRendererConfigPub = {
      cubicModelAssetId: null // , animationId: null,
      // horizontalFlip: false, verticalFlip: false,
      // castShadow: false, receiveShadow: false,
      // color: "ffffff",
      // overrideOpacity: false, opacity: null,
      // materialType: "basic", shaderAssetId: null
    };
    return emptyConfig;
  }

  pub: CubicModelRendererConfigPub;

  constructor(pub: CubicModelRendererConfigPub) {
    super(pub, CubicModelRendererConfig.schema);
  }

  restore() {
    if (this.pub.cubicModelAssetId != null) this.emit("addDependencies", [ this.pub.cubicModelAssetId ]);
    // if (this.pub.shaderAssetId != null) this.emit("addDependencies", [ this.pub.shaderAssetId ]);
  }
  destroy() {
    if (this.pub.cubicModelAssetId != null) this.emit("removeDependencies", [ this.pub.cubicModelAssetId ]);
    // if (this.pub.shaderAssetId != null) this.emit("removeDependencies", [ this.pub.shaderAssetId ]);
  }

  setProperty(path: string, value: any, callback: (err: string, actualValue?: any) => any) {
    let oldDepId: string;
    if (path === "cubicModelAssetId") oldDepId = this.pub.cubicModelAssetId;
    // if (path === "shaderAssetId") oldDepId = this.pub.shaderAssetId;

    super.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      if (path === "cubicModelAssetId" || path === "shaderAssetId") {
        if (oldDepId != null) this.emit("removeDependencies", [ oldDepId ]);
        if (actualValue != null) this.emit("addDependencies", [ actualValue ]);
      }

      // if (path === "overrideOpacity") this.pub.opacity = null;

      callback(null, actualValue);
    });
  }
}
