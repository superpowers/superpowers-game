interface SelectionBox extends SupEngine.ActorComponent {
  setTarget(target: THREE.Object3D): void;
  move(): void;
  resize(): void;
}

interface TransformHandle extends SupEngine.ActorComponent {
  control: any;
  target: THREE.Object3D;
  mode: string;

  setMode(mode: string): void;
  setSpace(space: string): void;
  setTarget(target: THREE.Object3D): void;
  move(): void;
}

interface TransformMarker extends SupEngine.ActorComponent {
  move(target: THREE.Object3D): void;
  hide(): void;
}
