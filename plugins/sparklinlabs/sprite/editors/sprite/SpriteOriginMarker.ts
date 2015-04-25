let THREE = SupEngine.THREE;

export default class SpriteOriginMarker extends SupEngine.ActorComponent {

  line: THREE.Line;

  constructor(actor: SupEngine.Actor) {
    super(actor, "SpriteOriginMarker");

    let geometry = new THREE.Geometry();
    geometry.vertices.push(
      new THREE.Vector3( -0.2, 0, 0 ),
      new THREE.Vector3(  0.2, 0, 0 ),

      new THREE.Vector3( 0, -0.2, 0 ),
      new THREE.Vector3( 0,  0.2, 0 )
    )

    this.line = new THREE.Line(geometry, new THREE.LineBasicMaterial( {color: 0x333333, opacity: 0.25, transparent: true} ), THREE.LinePieces);
    this.actor.threeObject.add(this.line);
    this.line.updateMatrixWorld(false);
  }

  setScale(scale: number) {
    this.line.scale.set(scale, scale, scale);
    this.line.updateMatrixWorld(false)
  }

  _destroy() {
    this.actor.threeObject.remove(this.line);
    this.line.geometry.dispose()
    this.line.material.dispose()
    this.line = null

    super._destroy();
  }
}
