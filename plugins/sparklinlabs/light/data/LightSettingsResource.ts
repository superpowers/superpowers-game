import * as path from "path";
import * as fs from "fs";

export default class LightSettingsResource extends SupCore.Data.Base.Resource {

  static schema: SupCore.Data.Base.Schema = {
    shadowMapType: { type: "enum", items: [ "basic", "pcf", "pcfSoft" ], mutable: true },
  }

  constructor(pub: any, server: ProjectServer) {
    super(pub, LightSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      shadowMapType: "basic"
    };

    super.init(callback);
  }
}
