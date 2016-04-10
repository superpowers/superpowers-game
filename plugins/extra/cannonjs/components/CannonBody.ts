let THREE = SupEngine.THREE;

export default class CannonBody extends SupEngine.ActorComponent {

  body: any;
  mass: number;
  fixedRotation: boolean;
  group: number;
  mask: number;

  actorPosition = new THREE.Vector3();
  actorOrientation = new THREE.Quaternion();

  shape: string;

  // attributes common to each shape
  positionOffset: { x: number; y: number; z: number; };
  orientationOffset: { x: number; y: number; z: number };

  // Box
  halfSize: { x: number; y: number; z: number; };

  // Sphere and cylinder
  radius: number;

  // Cylinder
  height: number;
  segments: number;

  constructor(actor: SupEngine.Actor) {
    super(actor, "CannonBody");

    this.body = new (<any>window).CANNON.Body();
    (<any>SupEngine).Cannon.World.addBody(this.body);
  }

  setIsLayerActive(active: boolean) { /* Nothing to render */ }

  setup(config: any) {
    this.mass = config.mass != null ? config.mass : 0;
    this.fixedRotation = config.fixedRotation != null ? config.fixedRotation : false;
    this.positionOffset = config.positionOffset != null ? config.positionOffset : { x: 0, y: 0, z: 0 };
    this.group = config.group != null ? config.group : 1;
    this.mask = config.mask != null ? config.mask : 1;

    this.actor.getGlobalPosition(this.actorPosition);
    this.actor.getGlobalOrientation(this.actorOrientation);

    this.body.mass = this.mass;
    this.body.type = this.mass === 0 ? (<any>window).CANNON.Body.STATIC : (<any>window).CANNON.Body.DYNAMIC;
    this.body.material = (<any>SupEngine).Cannon.World.defaultMaterial;
    this.body.fixedRotation = this.fixedRotation;
    this.body.collisionFilterGroup = this.group;
    this.body.collisionFilterMask = this.mask;
    this.body.updateMassProperties();

    if (config.orientationOffset != null) {
      this.orientationOffset = {
        x: THREE.Math.degToRad(config.orientationOffset.x),
        y: THREE.Math.degToRad(config.orientationOffset.y),
        z: THREE.Math.degToRad(config.orientationOffset.z)
      };
    } else {
      this.orientationOffset = { x: 0, y: 0, z: 0 };
    }

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
        this.segments = config.segments != null ? config.segments : 16;
        this.body.addShape(new (<any>window).CANNON.Cylinder(this.radius, this.radius, this.height, this.segments));
        break;
    }
    this.body.position.set(this.actorPosition.x, this.actorPosition.y, this.actorPosition.z);
    this.body.shapeOffsets[0].copy(this.positionOffset);
    this.body.shapeOrientations[0].setFromEuler(this.orientationOffset.x, this.orientationOffset.y, this.orientationOffset.z);
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
