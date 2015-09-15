let THREE = SupEngine.THREE;

import CameraUpdater from "./CameraUpdater";

export default  class CameraMarker extends SupEngine.ActorComponent {

  static Updater = CameraUpdater;

  viewport: { x: number; y: number; width: number; height: number; };
  nearClippingPlane: number;
  farClippingPlane: number;
  isOrthographic: boolean;
  fov: number;
  orthographicScale: number;
  ratio: number;

  projectionNeedsUpdate: boolean;
  line: THREE.Line;

  constructor(actor: SupEngine.Actor) {
    super(actor, "Marker");

    this.viewport = { x: 0, y: 0, width: 1, height: 1 };

    this.projectionNeedsUpdate = true;

    let geometry = new THREE.Geometry();
    for (let i = 0; i < 24; i++) geometry.vertices.push(new THREE.Vector3(0,0,0));

    this.line = new THREE.Line(geometry, new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 0.5, transparent: true } ), THREE.LinePieces);
    this.actor.threeObject.add(this.line);
    this.line.updateMatrixWorld(false);
  }

  setIsLayerActive(active: boolean) { this.line.visible = active; }

  setConfig(config: any) {
    this.setOrthographicMode(config.mode === "orthographic");
    this.setFOV(config.fov);
    this.setOrthographicScale(config.orthographicScale);
    this.setViewport(config.viewport.x, config.viewport.y, config.viewport.width, config.viewport.height);
    this.setNearClippingPlane(config.nearClippingPlane);
    this.setFarClippingPlane(config.farClippingPlane);

    this.projectionNeedsUpdate = false;
    this._resetGeometry();
  }

  setOrthographicMode(isOrthographic: boolean) {
    this.isOrthographic = isOrthographic;
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

  setNearClippingPlane(nearClippingPlane: number) {
    this.nearClippingPlane = nearClippingPlane;
    this.projectionNeedsUpdate = true;
  }

  setFarClippingPlane(farClippingPlane: number) {
    this.farClippingPlane = farClippingPlane;
    this.projectionNeedsUpdate = true;
  }

  setRatio(ratio: number) {
    this.ratio = ratio;
    this.projectionNeedsUpdate = true;
  }

  _resetGeometry() {
    let near = this.nearClippingPlane;
    let far = this.farClippingPlane;

    let farTopRight: THREE.Vector3;
    let nearTopRight: THREE.Vector3;

    if (this.isOrthographic) {
      let right = this.orthographicScale / 2 * this.viewport.width / this.viewport.height;
      if (this.ratio != null) right *= this.ratio;
      farTopRight = new THREE.Vector3(right, this.orthographicScale / 2, far);
      nearTopRight = new THREE.Vector3(right, this.orthographicScale / 2, near);
    }
    else {
      let tan = Math.tan(THREE.Math.degToRad(this.fov / 2));
      farTopRight = new THREE.Vector3(far * tan, far * tan, far);
      nearTopRight = farTopRight.clone().normalize().multiplyScalar(near);
    }

    // Near plane
    this.line.geometry.vertices[0].set(-nearTopRight.x,  nearTopRight.y, -near);
    this.line.geometry.vertices[1].set( nearTopRight.x,  nearTopRight.y, -near);
    this.line.geometry.vertices[2].set( nearTopRight.x,  nearTopRight.y, -near);
    this.line.geometry.vertices[3].set( nearTopRight.x, -nearTopRight.y, -near);
    this.line.geometry.vertices[4].set( nearTopRight.x, -nearTopRight.y, -near);
    this.line.geometry.vertices[5].set(-nearTopRight.x, -nearTopRight.y, -near);
    this.line.geometry.vertices[6].set(-nearTopRight.x, -nearTopRight.y, -near);
    this.line.geometry.vertices[7].set(-nearTopRight.x,  nearTopRight.y, -near);

    // Far plane
    this.line.geometry.vertices[8].set( -farTopRight.x,  farTopRight.y, -far);
    this.line.geometry.vertices[9].set(  farTopRight.x,  farTopRight.y, -far);
    this.line.geometry.vertices[10].set( farTopRight.x,  farTopRight.y, -far);
    this.line.geometry.vertices[11].set( farTopRight.x, -farTopRight.y, -far);
    this.line.geometry.vertices[12].set( farTopRight.x, -farTopRight.y, -far);
    this.line.geometry.vertices[13].set(-farTopRight.x, -farTopRight.y, -far);
    this.line.geometry.vertices[14].set(-farTopRight.x, -farTopRight.y, -far);
    this.line.geometry.vertices[15].set(-farTopRight.x,  farTopRight.y, -far);

    // Lines
    this.line.geometry.vertices[16].set(-nearTopRight.x,  nearTopRight.y, -near);
    this.line.geometry.vertices[17].set( -farTopRight.x,   farTopRight.y, -far);
    this.line.geometry.vertices[18].set( nearTopRight.x,  nearTopRight.y, -near);
    this.line.geometry.vertices[19].set(  farTopRight.x,   farTopRight.y, -far);
    this.line.geometry.vertices[20].set( nearTopRight.x, -nearTopRight.y, -near);
    this.line.geometry.vertices[21].set(  farTopRight.x,  -farTopRight.y, -far);
    this.line.geometry.vertices[22].set(-nearTopRight.x, -nearTopRight.y, -near);
    this.line.geometry.vertices[23].set( -farTopRight.x,  -farTopRight.y, -far);

    this.line.geometry.verticesNeedUpdate = true;
  }

  _destroy() {
    this.actor.threeObject.remove(this.line);
    this.line.geometry.dispose();
    this.line.material.dispose();
    this.line = null;

    super._destroy();
  }

  update() {
    if (this.projectionNeedsUpdate) {
      this.projectionNeedsUpdate = false;
      this._resetGeometry();
    }
  }
}
