export default class ProjectSettingsResource extends SupCore.data.base.Resource {
  static schema = {
    // members: ...
  }

  constructor(pub: any, serverData?: any) {
    super(pub, ProjectSettingsResource.schema, serverData);
  }

  init(callback: Function) {
    this.pub = { framesPerSecond: 60, ratioNumerator: null, ratioDenominator: null };
    super.init(callback);
  }
}
