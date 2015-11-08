export interface AttributePub {
  id: string;
  name: string;
  type: string;
}

export default class Attributes extends SupCore.Data.Base.ListById {

  static schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    type: { type: "enum", items: ["f", "c", "v2", "v3", "v4"], mutable: true }
  }

  pub: AttributePub[];
  byId: { [id: string]: AttributePub};

  constructor(pub: any) {
    super(pub, Attributes.schema);
  }
}
