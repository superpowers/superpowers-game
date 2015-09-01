interface SelectionBox extends SupEngine.ActorComponent {
  setTarget(actor: SupEngine.Actor): void;
  move(): void;
  resize(): void;
}

interface TransformHandle extends SupEngine.ActorComponent {
  control: any;
  target: SupEngine.Actor;
  mode: string;

  setMode(mode: string): void;
  setSpace(space: string): void;
  setTarget(actor: SupEngine.Actor): void;
  move(): void;
}

interface TransformMarker extends SupEngine.ActorComponent {
}
