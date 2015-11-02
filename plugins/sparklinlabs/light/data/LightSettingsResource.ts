import * as path from "path";
import * as fs from "fs";

export default class LightSettingsResource extends SupCore.data.base.Resource {

  static schema: SupCore.data.base.Schema = {
    shadowMapType: { type: "enum", items: [ "basic", "pcf", "pcfSoft" ], mutable: true },
  }

  constructor(pub: any, serverData: any) {
    super(pub, LightSettingsResource.schema, serverData);
  }

  setup() {}

  init(callback: Function) {
    this.pub = {
      shadowMapType: "basic"
    };

    super.init(callback);
  }
}
