class SpriteAnimations extends SupCore.data.base.ListById {

  static schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    startFrameIndex: { type: "number", min: 0, mutable: true },
    endFrameIndex: { type: "number", min: 0, mutable: true }
  }

  constructor(pub: any) {
    super(pub, SpriteAnimations.schema);
  }
}
export = SpriteAnimations;
