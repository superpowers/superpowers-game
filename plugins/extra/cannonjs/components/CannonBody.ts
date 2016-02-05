let THREE = SupEngine.THREE;

export default class CannonBody extends SupEngine.ActorComponent {

  body: any;
  mass: number;
  fixedRotation: boolean;
  offset: { x: number; y: number; z: number; };

  actorPosition = new THREE.Vector3();
  actorOrientation = new THREE.Quaternion();

  shape: string;

  // Box
  halfSize: { x: number; y: number; z: number; };

  // Sphere and cylinder
  radius: number;

  // Cylinder
  height: number;

  constructor(actor: SupEngine.Actor) {
    super(actor, "CannonBody");

    this.body = new (<any>window).CANNON.Body();
    (<any>SupEngine).Cannon.World.addBody(this.body);
  }

  setIsLayerActive(active: boolean) { /* Nothing to render */ }

  setup(config: any) {
    this.mass = config.mass != null ? config.mass : 0;
    this.fixedRotation = config.fixedRotation != null ? config.fixedRotation : false;
    this.offset = config.offset != null ? config.offset : { x: 0, y: 0, z: 0 };

    this.actor.getGlobalPosition(this.actorPosition);
    this.actor.getGlobalOrientation(this.actorOrientation);

    this.body.mass = this.mass;
    this.body.type = this.mass === 0 ? (<any>window).CANNON.Body.STATIC : (<any>window).CANNON.Body.DYNAMIC;

    this.body.material = (<any>SupEngine).Cannon.World.defaultMaterial;
    this.body.fixedRotation = this.fixedRotation;
    this.body.updateMassProperties();

    this.shape = config.shape;
    switch (this.shape) {
      case "box":
        this.halfSize = config.halfSize != null ? config.halfSize : { x: 0.5, y: 0.5, z: 0.5 };
        this.body.addShape(new (<any>window).CANNON.Box(new (<any>window).CANNON.Vec3().copy(this.halfSize)));
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
    this.body.shapeOffsets[0].copy(this.offset);
    this.body.quaternion.set(this.actorOrientation.x, this.actorOrientation.y, this.actorOrientation.z, this.actorOrientation.w);
  }

  update() {
    this.actorPosition.set(this.body.position.x, this.body.position.y, this.body.position.z);
    this.actor.setGlobalPosition(this.actorPosition);

    this.actorOrientation.set(this.body.quaternion.x, this.body.quaternion.y, this.body.quaternion.z, this.body.quaternion.w);
    this.actor.setGlobalOrientation(this.actorOrientation);
  }

  _destroy() {
    (<any>SupEngine).Cannon.World.remove(this.body);
    this.body = null;
    super._destroy();
  }
}
