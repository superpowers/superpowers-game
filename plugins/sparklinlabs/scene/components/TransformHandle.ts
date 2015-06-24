let THREE = SupEngine.THREE;
import "./TransformControls";

export default class TransformHandle extends SupEngine.ActorComponent {
  control: any; // : THREE.TransformControls;

  target: SupEngine.Actor;
  mode = "translate";
  space = "world";

  constructor(actor: SupEngine.Actor, threeCamera: THREE.Camera) {
    super(actor, "TransformHandle");

    this.control = new (<any>THREE).TransformControls(threeCamera, actor.gameInstance.threeRenderer.domElement);
    this.actor.gameInstance.threeScene.add(this.control);
  }

  update() {
    this.control.update();
    this.control.updateMatrixWorld(true);
  }

  setMode(mode: string) { this.mode = mode; if (this.target != null) this.control.setMode(mode); }
  setSpace(space: string) { this.space = space; if (this.target != null) this.control.setSpace(space); }

  setTarget(actor: SupEngine.Actor) {
    this.target = actor;

    if (this.target != null) {
      this.move();
      this.control.attach(this.actor.threeObject);
      this.control.setSpace(this.space);
      this.control.setMode(this.mode);
    } else {
      this.control.detach(this.actor.threeObject);
    }
  }

  move() {
    this.actor.threeObject.position.copy(this.target.getGlobalPosition());
    this.actor.threeObject.quaternion.copy(this.target.getGlobalOrientation());
    this.actor.threeObject.updateMatrixWorld(false);
  }

  _destroy() {
    this.control.detach();
    this.actor.gameInstance.threeScene.remove(this.control);

    super._destroy();
  }
}
