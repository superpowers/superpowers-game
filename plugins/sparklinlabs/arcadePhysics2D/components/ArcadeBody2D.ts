let THREE = SupEngine.THREE;
let ArcadePhysics2D = (<any>SupEngine).ArcadePhysics2D;

class ArcadeBody2D extends SupEngine.ActorComponent {
  movable: boolean;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  bounceX: number;
  bounceY: number;

  actorPosition: THREE.Vector3;
  position: THREE.Vector3;
  previousPosition: THREE.Vector3;

  velocity: THREE.Vector3;
  velocityMin: THREE.Vector3;
  velocityMax: THREE.Vector3;
  velocityMultiplier: THREE.Vector3;

  touches = { top: false, bottom: false, right: false, left: false };

  constructor(actor: SupEngine.Actor, config={}) {
    super(actor, "ArcadeBody2D");

    this.setup(config);
    ArcadePhysics2D.allBodies.push( this );
  }

  setup(config: any) {
    this.movable = (config.movable != null) ? config.movable : true;
    this.width = (config.width != null) ? config.width : 1;
    this.height = (config.height != null) ? config.height : 1;
    this.offsetX = (config.offsetX != null) ? config.offsetX : 0;
    this.offsetY = (config.offsetY != null) ? config.offsetY : 0;
    this.bounceX = (config.bounceX != null) ? config.bounceX : 0;
    this.bounceY = (config.bounceY != null) ? config.bounceY : 0;

    this.actorPosition = this.actor.getGlobalPosition();
    this.position = this.actorPosition.clone();
    this.position.x += this.offsetX;
    this.position.y += this.offsetY;
    this.previousPosition = this.position.clone();

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.velocityMin = new THREE.Vector3(-0.5, -0.5, 0);
    this.velocityMax = new THREE.Vector3(0.5, 0.5, 0);
    this.velocityMultiplier = new THREE.Vector3(0, 0, 0);
  }

  earlyUpdate() {
    if (! this.movable) return;

    this.previousPosition.copy(this.position);

    this.velocity.x += ArcadePhysics2D.gravity.x * 1 / SupEngine.GameInstance.framesPerSecond;
    this.velocity.x *= 1 + this.velocityMultiplier.x / 100;

    this.velocity.y += ArcadePhysics2D.gravity.y * 1 / SupEngine.GameInstance.framesPerSecond;
    this.velocity.y *= 1 + this.velocityMultiplier.y / 100;
    if (this.velocity.length() !== 0) {
      this.velocity.x = Math.min( Math.max( this.velocity.x, this.velocityMin.x ), this.velocityMax.x );
      this.velocity.y = Math.min( Math.max( this.velocity.y, this.velocityMin.y ), this.velocityMax.y );
      this.position.add(this.velocity);
      this.refreshActorPosition();
    }
  }

  warpPosition(position: THREE.Vector3) {
    this.position.x = position.x + this.offsetX;
    this.position.y = position.y + this.offsetY;
    this.refreshActorPosition();
  }

  refreshActorPosition() {
    this.actorPosition.x = this.position.x - this.offsetX;
    this.actorPosition.y = this.position.y - this.offsetY;
    this.actor.setGlobalPosition(this.actorPosition);
  }

  _destroy() {
    ArcadePhysics2D.allBodies.splice( ArcadePhysics2D.allBodies.indexOf( this ), 1 );
    super._destroy();
  }

  right() { return this.position.x + this.width / 2; }
  left() { return this.position.x - this.width / 2; }
  top() { return this.position.y + this.height / 2; }
  bottom() { return this.position.y - this.height / 2; }
  deltaX() { return this.position.x - this.previousPosition.x; }
  deltaY() { return this.position.y - this.previousPosition.y; }
}
export = ArcadeBody2D;
