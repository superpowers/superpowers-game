export default class GameSettingsResource extends SupCore.data.base.Resource {
  static schema: SupCore.data.base.Schema = {
    startupScene: { type: "string?", mutable: true },
    framesPerSecond: { type: "integer", minExcluded: 0, mutable: true },
    ratioNumerator: { type: "integer?", mutable: true },
    ratioDenominator: { type: "integer?", mutable: true },
    customLayers: {
      type: "array", mutable: true, minLength: 0, maxLength: 8,
      items: { type: "string", minLength: 1, maxLength: 80 }
    }
  }

  constructor(pub: any, serverData?: any) {
    if (pub != null) {
      // NOTE: Custom layers were introduced in Superpowers 0.8
      if (pub.customLayers == null) pub.customLayers = [];
    }

    super(pub, GameSettingsResource.schema, serverData);
  }

  init(callback: Function) {
    this.pub = {
      startupScene: null,
      framesPerSecond: 60,
      ratioNumerator: null, ratioDenominator: null,
      customLayers: []
    };
    super.init(callback);
  }
}
