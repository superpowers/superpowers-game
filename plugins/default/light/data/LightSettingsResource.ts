export default class LightSettingsResource extends SupCore.Data.Base.Resource {

  static schema: SupCore.Data.Schema = {
    shadowMapType: { type: "enum", items: [ "basic", "pcf", "pcfSoft" ], mutable: true },
  };

  constructor(id: string, pub: any, server: ProjectServer) {
    super(id, pub, LightSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      shadowMapType: "basic"
    };

    super.init(callback);
  }
}
