import THREE = require("three");
import Actor = require("../Actor");
import ActorComponent = require("../ActorComponent");

class Camera extends ActorComponent {
  fov = 45;
  orthographicScale = 10;
  halfPixelTranslationMatrix = new THREE.Matrix4();

  threeCamera: THREE.OrthographicCamera|THREE.PerspectiveCamera;
  viewport = { x: 0, y: 0, width: 1, height: 1 };

  cachedRatio: number;
  isOrthographic: boolean;
  projectionNeedsUpdate: boolean;

  constructor(actor: Actor) {
    super(actor, 'Camera');

    this.setOrthographicMode(false);

    this._computeAspectRatio()
    this.actor.gameInstance.on('resize', this._computeAspectRatio);
  }

  _destroy() {
    this.actor.gameInstance.removeListener('resize', this._computeAspectRatio);

    var index = this.actor.gameInstance.renderComponents.indexOf(this);
    if (index != -1) this.actor.gameInstance.renderComponents.splice(index, 1);

    this.threeCamera = null;

    super._destroy();
  }

  _computeAspectRatio() {
    var canvas = this.actor.gameInstance.threeRenderer.domElement;
    this.cachedRatio = (canvas.width * this.viewport.width) / (canvas.height * this.viewport.height)
    this.projectionNeedsUpdate = true;
  }

  setOrthographicMode(isOrthographic: boolean) {
    this.isOrthographic = isOrthographic;
    var nearClippingPlane = 0.1;
    var farClippingPlane = 1000;

    if (this.isOrthographic) {
      this.threeCamera = new THREE.OrthographicCamera(-this.orthographicScale * this.cachedRatio / 2,
        this.orthographicScale * this.cachedRatio / 2,
        this.orthographicScale / 2, -this.orthographicScale / 2,
        nearClippingPlane, farClippingPlane);
    }
    else this.threeCamera = new THREE.PerspectiveCamera(this.fov, this.cachedRatio, nearClippingPlane, farClippingPlane);

    this.projectionNeedsUpdate = true;
  }

  setFOV(fov: number) {
    this.fov = fov;
    if (! this.isOrthographic) this.projectionNeedsUpdate = true;
  }

  setOrthographicScale(orthographicScale: number) {
    this.orthographicScale = orthographicScale;
    if (this.isOrthographic) this.projectionNeedsUpdate = true;
  }

  setViewport(x: number, y: number, width: number, height: number) {
    this.viewport.x = x;
    this.viewport.y = y;
    this.viewport.width = width;
    this.viewport.height = height;
    this.projectionNeedsUpdate = true;
  }

  start() { this.actor.gameInstance.renderComponents.push(this); }

  render() {
    //FIX ME: Remove optional parameter (waiting for fix in THREE.d.ts)
    this.threeCamera.position.copy(this.actor.threeObject.getWorldPosition(null));
    this.threeCamera.quaternion.copy(this.actor.threeObject.getWorldQuaternion(null));

    if (this.projectionNeedsUpdate) {
      this.projectionNeedsUpdate = false;
      this.threeCamera.updateProjectionMatrix();

      if (this.isOrthographic) {
        var orthographicCamera = <THREE.OrthographicCamera>this.threeCamera;
        orthographicCamera.left = -this.orthographicScale * this.cachedRatio / 2;
        orthographicCamera.right = this.orthographicScale * this.cachedRatio / 2;
        orthographicCamera.top = this.orthographicScale / 2;
        orthographicCamera.bottom = -this.orthographicScale / 2;

        // FIXME: Is it required? It's buggy at least.
        // this.halfPixelTranslationMatrix.makeTranslation -0.5 / (this.orthographicScale  * this.cachedRatio), 0.5 / this.orthographicScale, 0
        orthographicCamera.updateProjectionMatrix();
        // orthographicCamera.projectionMatrix.multiplyMatrices this.halfPixelTranslationMatrix, this.threeCamera.projectionMatrix
      }
      else {
        var perspectiveCamera = <THREE.PerspectiveCamera>this.threeCamera;
        perspectiveCamera.fov = this.fov;
        perspectiveCamera.aspect = this.cachedRatio;
        perspectiveCamera.updateProjectionMatrix();
      }
    }

    var canvas = this.actor.gameInstance.threeRenderer.domElement;
    this.actor.gameInstance.threeRenderer.setViewport(
      this.viewport.x * canvas.width    , ( 1 - this.viewport.y - this.viewport.height ) * canvas.height,
      this.viewport.width * canvas.width, this.viewport.height * canvas.height
    );
    this.actor.gameInstance.threeRenderer.render(this.actor.gameInstance.threeScene, this.threeCamera);
  }
}

export = Camera;
