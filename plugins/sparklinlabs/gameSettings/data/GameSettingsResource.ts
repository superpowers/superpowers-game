class GameSettingsResource extends SupCore.data.base.Resource {
  static schema = {
    framesPerSecond: { type: "integer", mutable: true },
    ratioNumerator: { type: "integer?", mutable: true },
    ratioDenominator: { type: "integer?", mutable: true }
  }

  constructor(pub: any, serverData?: any) {
    super(pub, GameSettingsResource.schema, serverData);
  }

  init(callback: Function) {
    this.pub = { framesPerSecond: 60, ratioNumerator: null, ratioDenominator: null };
    super.init(callback);
  }
}
export = GameSettingsResource;
