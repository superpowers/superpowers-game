export default class CubicModelSettingsResource extends SupCore.Data.Base.Resource {

  static schema: SupCore.Data.Schema = {
    pixelsPerUnit: { type: "integer", min: 1, mutable: true }
  };

  constructor(id: string, pub: any, server: ProjectServer) {
    super(id, pub, CubicModelSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      pixelsPerUnit: 16
    };

    super.init(callback);
  }
}
