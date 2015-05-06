let THREE = SupEngine.THREE;

export default class ArcadeBody2D extends SupEngine.ActorComponent {
  type: string;

  movable = false;
  width = 1;
  height = 1;
  offsetX = 0;
  offsetY = 0;
  bounceX = 0;
  bounceY = 0;

  tileMapAsset: any;
  tileSetAsset: any;
  tileSetPropertyName: string;
  mapToSceneFactor: number;
  layersIndex: number[] = [];

  actorPosition: THREE.Vector3;
  position: THREE.Vector3;
  previousPosition: THREE.Vector3;

  velocity: THREE.Vector3;
  velocityMin: THREE.Vector3;
  velocityMax: THREE.Vector3;
  velocityMultiplier: THREE.Vector3;

  touches = { top: false, bottom: false, right: false, left: false };

  constructor(actor: SupEngine.Actor, type: string, config: any) {
    super(actor, "ArcadeBody2D");

    if (type === "box") this.setupBox(config);
    else if (type === "tileMap") this.setupTileMap(config);
    (<any>SupEngine).ArcadePhysics2D.allBodies.push( this );
  }

  setupBox(config: any) {
    this.type = "box";

    this.movable = config.movable;
    this.width = config.width;
    this.height = config.height;
    if (config.offsetX != null) this.offsetX = config.offsetX;
    if (config.offsetY != null) this.offsetY = config.offsetY;
    if (config.bounceX != null) this.bounceX = config.bounceX;
    if (config.bounceY != null) this.bounceY = config.bounceY;

    this.actorPosition = this.actor.getGlobalPosition();
    this.position = this.actorPosition.clone();
    this.position.x += this.offsetX;
    this.position.y += this.offsetY;
    this.previousPosition = this.position.clone();

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.velocityMin = new THREE.Vector3(-Infinity, -Infinity, 0);
    this.velocityMax = new THREE.Vector3(Infinity, Infinity, 0);
    this.velocityMultiplier = new THREE.Vector3(1, 1, 0);
  }

  setupTileMap(config: any) {
    this.type = "tileMap";
    this.tileMapAsset = config.tileMapAsset;
    this.tileSetAsset = config.tileSetAsset;
    this.mapToSceneFactor = this.tileSetAsset.__inner.data.gridSize / this.tileMapAsset.__inner.data.pixelsPerUnit;
    this.tileSetPropertyName = config.tileSetPropertyName;
    if (config.layersIndex != null) {
      let layers = config.layersIndex.split(",");
      for (let layer in layers) this.layersIndex.push(parseInt(layer));
    } else {
      for (let i = 0; i < this.tileMapAsset.__inner.data.layers.length; i++) this.layersIndex.push(i);
    }

    this.position = this.actor.getGlobalPosition();
  }

  earlyUpdate() {
    if (! this.movable) return;

    this.previousPosition.copy(this.position);

    this.velocity.x += (<any>SupEngine).ArcadePhysics2D.gravity.x;
    this.velocity.x *= this.velocityMultiplier.x;

    this.velocity.y += (<any>SupEngine).ArcadePhysics2D.gravity.y;
    this.velocity.y *= this.velocityMultiplier.y;
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
    this.actor.setGlobalPosition(this.actorPosition.clone());
  }

  _destroy() {
    (<any>SupEngine).ArcadePhysics2D.allBodies.splice( (<any>SupEngine).ArcadePhysics2D.allBodies.indexOf( this ), 1 );
    super._destroy();
  }

  right() { return this.position.x + this.width / 2; }
  left() { return this.position.x - this.width / 2; }
  top() { return this.position.y + this.height / 2; }
  bottom() { return this.position.y - this.height / 2; }
  deltaX() { return this.position.x - this.previousPosition.x; }
  deltaY() { return this.position.y - this.previousPosition.y; }
}
