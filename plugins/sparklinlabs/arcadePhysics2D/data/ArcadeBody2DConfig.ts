export default class ArcadeBody2DConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    width: { type: "number", mutable: true },
    height: { type: "number", mutable: true },
    offsetX: { type: "number", mutable: true },
    offsetY: { type: "number", mutable: true },
    movable: { type: "boolean", mutable: true },
  }

  static create() {
    return {
      width: 1,
      height: 1,
      offsetX: 0,
      offsetY: 0,
      movable: true,
    }
  }

  constructor(pub: any) {
    super(pub, ArcadeBody2DConfig.schema);

    if (this.pub.offsetX == null) this.pub.offsetX = 0;
    if (this.pub.offsetY == null) this.pub.offsetY = 0;
  }
}
