export default class P2Body extends SupEngine.ActorComponent {
  body: any;

  mass: number;
  fixedRotation: boolean;
  offsetX: number;
  offsetY: number;
  shape: string;

  width: number;
  height: number;
  radius: number;

  actorPosition: THREE.Vector3;
  actorAngles: THREE.Euler;

  constructor(actor: SupEngine.Actor, config: any={}) {
    super(actor, "P2Body");

    this.body = new (<any>window).p2.Body();
    (<any>SupEngine).P2.World.addBody(this.body);
    if (config.shape == null) return;

    this.setup(config);
  }

  setup(config: any) {
    this.mass = (config.mass != null) ? config.mass : 0;
    this.fixedRotation = (config.fixedRotation != null) ? config.fixedRotation : false;
    this.offsetX = (config.offsetX != null) ? config.offsetX : 0;
    this.offsetY = (config.offsetY != null) ? config.offsetY : 0;

    this.actorPosition = this.actor.getGlobalPosition();
    this.actorAngles = this.actor.getGlobalEulerAngles();

    this.body.mass = this.mass;
    this.body.type = (this.mass === 0) ? (<any>window).p2.Body.STATIC : (<any>window).p2.Body.DYNAMIC;
    this.body.material = (<any>SupEngine).P2.World.defaultMaterial;
    this.body.fixedRotation = this.fixedRotation;
    this.body.updateMassProperties();

    this.shape = config.shape;
    switch (this.shape) {
      case "rectangle": {
        this.width = (config.width != null) ? config.width : 0.5;
        this.height = (config.height != null) ? config.height : 0.5;
        this.body.addShape(new (<any>window).p2.Rectangle(this.width, this.height))
        break;
      }
      case "circle": {
        this.radius = (config.radius != null) ? config.radius : 1;
        this.body.addShape(new (<any>window).p2.Circle(this.radius))
        break;
      }
      }
    this.body.position = [this.actorPosition.x, this.actorPosition.y]
    this.body.shapeOffsets[0] = [this.offsetX, this.offsetY]
    this.body.angle = this.actorAngles.z
  }

  update() {
    this.actorPosition.x = this.body.position[0];
    this.actorPosition.y = this.body.position[1];
    this.actor.setGlobalPosition(this.actorPosition);

    this.actorAngles.z = this.body.angle;
    this.actor.setGlobalEulerAngles(this.actorAngles);
  }

  _destroy() {
    (<any>SupEngine).P2.World.remove(this.body);
    this.body = null;
    super._destroy();
  }
}
