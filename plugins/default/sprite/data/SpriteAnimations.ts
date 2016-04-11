export interface SpriteAnimationPub {
  id: string;
  name: string;
  startFrameIndex: number;
  endFrameIndex: number;
  speed: number;
}

export default class SpriteAnimations extends SupCore.Data.Base.ListById {

  static schema: SupCore.Data.Schema = {
    name: { type: "string", minLength: 1, maxLength: 80, mutable: true },
    startFrameIndex: { type: "number", min: 0, mutable: true },
    endFrameIndex: { type: "number", min: 0, mutable: true },
    speed: { type: "number", mutable: true }
  };

  pub: SpriteAnimationPub[];
  byId: { [id: string]: SpriteAnimationPub};

  constructor(pub: SpriteAnimationPub[]) {
    super(pub, SpriteAnimations.schema);
  }
}
