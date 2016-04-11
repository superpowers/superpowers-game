export default class ModelAnimations extends SupCore.Data.Base.ListById {

  static schema: SupCore.Data.Schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    duration: { type: "number" }, // seconds
    keyFrames: {
      type: "hash",
      keys: { minLength: 1, maxLength: 80 },
      values: {
        type: "hash",
        properties: <{ [index: string]: SupCore.Data.Base.Rule }> {
          translation: {
            type: "array?",
            items: {
              type: "hash",
              properties: {
                time: { type: "number", min: 0 },
                value: { type: "array", items: { type: "number", length: 3 } }
              }
            }
          },
          rotation: {
            type: "array?",
            items: {
              type: "hash",
              properties: {
                time: { type: "number", min: 0 },
                value: { type: "array", items: { type: "number", length: 4 } }
              }
            }
          },
          scale: {
            type: "array?",
            items: {
              type: "hash",
              properties: {
                time: { type: "number", min: 0 },
                value: { type: "array", items: { type: "number", length: 3 } }
              }
            }
          }
        }
      }
    }
  };

  constructor(pub: any) {
    super(pub, ModelAnimations.schema);
  }
}
