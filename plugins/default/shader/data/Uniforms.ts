export interface UniformPub {
  id: string;
  name: string;
  type: string;
  value: any;
}

export default class Uniforms extends SupCore.Data.Base.ListById {
  static schema: SupCore.Data.Schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    type: { type: "enum", items: ["f", "c", "v2", "v3", "v4", "t"], mutable: true },
    value: { type: "any", mutable: true }
  };

  pub: UniformPub[];
  byId: { [id: string]: UniformPub };

  constructor(pub: any) {
    super(pub, Uniforms.schema);
  }

  setProperty(id: string, key: string, value: any, callback: (err: string, value: any) => any) {
    if (key === "value") {
      function checkArray(value: any, size: number) {
        if (!Array.isArray(value)) return false;
        if (value.length !== size) return false;
        for (let item of value) if (typeof item !== "number") return false;

        return true;
      }

      let item = this.byId[id];
      switch(item.type) {
        case "f":
          if (typeof value !== "number") { callback("Invalid value", null); return; }
          break;
        case "c":
        case "v3":
          if (!checkArray(value, 3)) { callback("Invalid value", null); return; }
          break;
        case "v2":
          if (!checkArray(value, 2)) { callback("Invalid value", null); return; }
          break;
        case "v4":
          if (!checkArray(value, 4)) { callback("Invalid value", null); return; }
          break;
        case "t":
          if (typeof value !== "string") { callback("Invalid value", null); return; }
          break;
      }
    }

    super.setProperty(id, key, value, (err, value) => {
      if (err != null) { callback(err, null); return; }

      callback(null, value);
      if (key === "type") this.updateItemValue(id, value);
    });
  }

  client_setProperty(id: string, key: string, value: any) {
    super.client_setProperty(id, key, value);

    if (key === "type") this.updateItemValue(id, value);
  }

  updateItemValue(id: string, value: any) {
    let item = this.byId[id];
    switch(value) {
      case "f": item.value = 0; break;
      case "c": item.value = [1, 1, 1]; break;
      case "v2": item.value = [0, 0]; break;
      case "v3": item.value = [0, 0, 0]; break;
      case "v4": item.value = [0, 0, 0, 0]; break;
      case "t": item.value = "map"; break;
    }
  }
}
