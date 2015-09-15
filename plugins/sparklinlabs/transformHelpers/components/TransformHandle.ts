let THREE = SupEngine.THREE;
import "./TransformControls";

export default class TransformHandle extends SupEngine.ActorComponent {
  control: any; // : THREE.TransformControls;

  target: THREE.Object3D;
  mode = "translate";
  space = "world";

  constructor(actor: SupEngine.Actor, threeCamera: THREE.Camera) {
    super(actor, "TransformHandle");

    this.control = new (<any>THREE).TransformControls(threeCamera, actor.gameInstance.threeRenderer.domElement);
    this.actor.gameInstance.threeScene.add(this.control);
  }

  setActiveLayer(active: boolean) { this.control.visible = active; }

  update() {
    this.control.update();
    this.control.updateMatrixWorld(true);
  }

  setMode(mode: string) {
    this.mode = mode;
    if (this.target != null) {
      this.control.setMode(mode);
      this.control.setSpace(this.mode === "scale" ? "local" : this.space);
    }
  }

  setSpace(space: string) {
    this.space = space;
    if (this.target != null && this.mode !== "scale") this.control.setSpace(space);
  }

  setTarget(target: THREE.Object3D) {
    this.target = target;

    if (this.target != null) {
      this.control.attach(this.actor.threeObject);
      this.control.setSpace(this.mode === "scale" ? "local" : this.space);
      this.control.setMode(this.mode);
      this.move();
    } else {
      this.control.detach(this.actor.threeObject);
    }
  }

  move() {
    this.actor.threeObject.position.copy(this.target.getWorldPosition());
    this.actor.threeObject.quaternion.copy(this.target.getWorldQuaternion());
    this.actor.threeObject.scale.copy(this.target.scale);
    this.actor.threeObject.updateMatrixWorld(false);

    this.control.update();
    this.control.updateMatrixWorld(true);
  }

  _destroy() {
    this.control.detach();
    this.actor.gameInstance.threeScene.remove(this.control);

    super._destroy();
  }
}
