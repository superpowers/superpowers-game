export default
class CannonBody extends SupEngine.ActorComponent {

  body:any;
  mass:number;
  fixedRotation:boolean;
  offsetX:number;
  offsetY:number;
  offsetZ:number;
  actorPosition:THREE.Vector3;
  actorOrientation:THREE.Quaternion;
  halfWidth:number;
  halfHeight:number;
  halfDepth:number;
  radius:number;
  height:number;
  shape:string;

  constructor(actor:SupEngine.Actor, config:any) {
    super(actor, "CannonBody");

    if (config == null) config = {};

    this.body = new (<any>window).CANNON.Body();
    (<any>SupEngine).Cannon.World.addBody(this.body);

    if (config.shape != null) this.setup(config)

  }

  setup(config:any) {
    this.mass = config.mass != null ? config.mass : 0;
    this.fixedRotation = config.fixedRotation != null ? config.fixedRotation : false;
    this.offsetX = config.offsetX != null ? config.offsetX : 0;
    this.offsetY = config.offsetY != null ? config.offsetY : 0;
    this.offsetZ = config.offsetZ != null ? config.offsetZ : 0;

    this.actorPosition = this.actor.getGlobalPosition();
    this.actorOrientation = this.actor.getGlobalOrientation();

    this.body.mass = this.mass;
    this.body.type = this.mass == 0 ? (<any>window).CANNON.Body.STATIC : (<any>window).CANNON.Body.DYNAMIC;

    this.body.material = (<any>SupEngine).Cannon.World.defaultMaterial;
    this.body.fixedRotation = this.fixedRotation;
    this.body.updateMassProperties();

    this.shape = config.shape;
    switch (this.shape) {
      case "box":
        this.halfWidth = config.halfWidth != null ? config.halfWidth : 0.5;
        this.halfHeight = config.halfHeight != null ? config.halfHeight : 0.5;
        this.halfDepth = config.halfDepth != null ? config.halfDepth : 0.5;
        this.body.addShape(new (<any>window).CANNON.Box(new (<any>window).CANNON.Vec3(this.halfWidth, this.halfHeight, this.halfDepth)));
        break;

      case "sphere":
        this.radius = config.radius != null ? config.radius : 1;
        this.body.addShape(new (<any>window).CANNON.Sphere(this.radius));
        break;
      case "cylinder":
        this.radius = config.radius != null ? config.radius : 1;
        this.height = config.height != null ? config.height : 1;
        this.body.addShape(new (<any>window).CANNON.Cylinder(this.radius, this.radius, this.height, 20));
        break;
    }
    this.body.position.set(this.actorPosition.x, this.actorPosition.y, this.actorPosition.z);
    this.body.shapeOffsets[0].set(this.offsetX, this.offsetY, this.offsetZ);
    this.body.quaternion.set(this.actorOrientation.x, this.actorOrientation.y, this.actorOrientation.z, this.actorOrientation.w);
  }

  update() {
    this.actorPosition.set(this.body.position.x, this.body.position.y, this.body.position.z);
    this.actor.setGlobalPosition(this.actorPosition);

    this.actorOrientation.set(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
    this.actor.setGlobalOrientation(this.actorOrientation)
  }

  _destroy() {
    (<any>SupEngine).Cannon.World.remove(this.body);
    this.body = null;
    super._destroy();
  }
}
