export default class GameSettingsResource extends SupCore.data.base.Resource {
  static schema = {
    startupScene: { type: "string?", mutable: true },
    framesPerSecond: { type: "integer", mutable: true },
    ratioNumerator: { type: "integer?", mutable: true },
    ratioDenominator: { type: "integer?", mutable: true }
  }

  constructor(pub: any, serverData?: any) {
    super(pub, GameSettingsResource.schema, serverData);
  }

  init(callback: Function) {
    this.pub = { startupScene: null, framesPerSecond: 60, ratioNumerator: null, ratioDenominator: null };
    super.init(callback);
  }
}
