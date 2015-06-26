interface TextEditorSettingsResourcePub {
  tabSize: number;
  softTab: boolean;
}

export default class TextEditorSettingsResource extends SupCore.data.base.Resource {

  static schema = {
    tabSize: { type: "number", min: 1, mutable: true },
    softTab: { type: "boolean", mutable: true },
  }

  pub: TextEditorSettingsResourcePub;

  constructor(pub: any, serverData: any) {
    super(pub, TextEditorSettingsResource.schema, serverData);
  }

  setup() {}

  init(callback: Function) {
    this.pub = {
      tabSize: 2,
      softTab: true
    };

    super.init(callback);
  }
}
