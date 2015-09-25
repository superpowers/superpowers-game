let THREE = SupEngine.THREE;

export default class ArcadeBody2D extends SupEngine.ActorComponent {
  type: string;
  enabled = true;

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
  mapToSceneFactor: { x: number; y: number };
  layersIndex: number[] = [];

  actorPosition: THREE.Vector3;
  position: THREE.Vector3;
  previousPosition: THREE.Vector3;

  velocity: THREE.Vector3;
  velocityMin: THREE.Vector3;
  velocityMax: THREE.Vector3;
  velocityMultiplier: THREE.Vector3;

  touches = { top: false, bottom: false, right: false, left: false };

  constructor(actor: SupEngine.Actor, type: string) {
    super(actor, "ArcadeBody2D");

    (<any>SupEngine).ArcadePhysics2D.allBodies.push(this);
  }

  setIsLayerActive(active: boolean) {}

  setupBox(config: any) {
    this.type = "box";

    this.movable = config.movable;
    this.width = config.width;
    this.height = config.height;
    if (config.offset != null) {
      this.offsetX = config.offset.x;
      this.offsetY = config.offset.y;
    }
    if (config.bounceX != null) this.bounceX = config.bounceX;
    if (config.bounceY != null) this.bounceY = config.bounceY;

    this.actor.getGlobalPosition(this.actorPosition);
    this.position = this.actorPosition.clone();
    this.position.x += this.offsetX;
    if ((<any>SupEngine).ArcadePhysics2D.plane === "XY") this.position.y += this.offsetY;
    else this.position.z += this.offsetY;
    this.previousPosition = this.position.clone();

    this.velocity = new THREE.Vector3(0, 0, 0);
    this.velocityMin = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    this.velocityMax = new THREE.Vector3(Infinity, Infinity, Infinity);
    this.velocityMultiplier = new THREE.Vector3(1, 1, 1);
  }

  setupTileMap(config: any) {
    this.type = "tileMap";
    this.tileMapAsset = config.tileMapAsset;
    this.tileSetAsset = config.tileSetAsset;
    this.mapToSceneFactor = {
      x: this.tileSetAsset.__inner.data.grid.width / this.tileMapAsset.__inner.data.pixelsPerUnit,
      y: this.tileSetAsset.__inner.data.grid.height / this.tileMapAsset.__inner.data.pixelsPerUnit,
    }
    this.tileSetPropertyName = config.tileSetPropertyName;
    if (config.layersIndex != null) {
      let layers = <string[]>config.layersIndex.split(",");
      for (let layer of layers) this.layersIndex.push(parseInt(layer.trim()));
    } else {
      for (let i = 0; i < this.tileMapAsset.__inner.data.layers.length; i++) this.layersIndex.push(i);
    }

    this.actor.getGlobalPosition(this.position);
  }

  earlyUpdate() {
    if (this.type === "tileMap") return;

    this.previousPosition.copy(this.position);
    if (!this.movable || !this.enabled) return;

    this.velocity.x += (<any>SupEngine).ArcadePhysics2D.gravity.x;
    this.velocity.x *= this.velocityMultiplier.x;
    this.velocity.x = Math.min(Math.max(this.velocity.x, this.velocityMin.x), this.velocityMax.x);

    if ((<any>SupEngine).ArcadePhysics2D.plane === "XY") {
      this.velocity.y += (<any>SupEngine).ArcadePhysics2D.gravity.y;
      this.velocity.y *= this.velocityMultiplier.y;
      this.velocity.y = Math.min(Math.max(this.velocity.y, this.velocityMin.y), this.velocityMax.y);
    } else if ((<any>SupEngine).ArcadePhysics2D.plane === "XZ") {
      this.velocity.z += (<any>SupEngine).ArcadePhysics2D.gravity.z;
      this.velocity.z *= this.velocityMultiplier.z;
      this.velocity.z = Math.min(Math.max(this.velocity.z, this.velocityMin.z), this.velocityMax.z);
    }
    this.position.add(this.velocity);
    this.refreshActorPosition();
  }

  warpPosition(position: THREE.Vector3) {
    this.position.x = position.x + this.offsetX;
    this.position.y = position.y;
    this.position.z = position.z;
    if ((<any>SupEngine).ArcadePhysics2D.plane === "XY") this.position.y += this.offsetY;
    else this.position.z += this.offsetY;
    this.refreshActorPosition();
  }

  refreshActorPosition() {
    this.actorPosition.x = this.position.x - this.offsetX;
    this.actorPosition.y = this.position.y;
    this.actorPosition.z = this.position.z;
    if ((<any>SupEngine).ArcadePhysics2D.plane === "XY") this.actorPosition.y -= this.offsetY;
    else this.actorPosition.z -= this.offsetY;
    this.actor.setGlobalPosition(this.actorPosition.clone());
  }

  _destroy() {
    (<any>SupEngine).ArcadePhysics2D.allBodies.splice((<any>SupEngine).ArcadePhysics2D.allBodies.indexOf(this), 1);
    super._destroy();
  }

  right() { return this.position.x + this.width / 2; }
  left() { return this.position.x - this.width / 2; }
  top() { return this.position.y + this.height / 2; }
  bottom() { return this.position.y - this.height / 2; }
  front() { return this.position.z + this.height / 2; }
  back() { return this.position.z - this.height / 2; }
  deltaX() { return this.position.x - this.previousPosition.x; }
  deltaY() { return this.position.y - this.previousPosition.y; }
  deltaZ() { return this.position.z - this.previousPosition.z; }
}
