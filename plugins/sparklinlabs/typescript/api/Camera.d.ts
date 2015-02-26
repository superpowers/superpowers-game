declare module Sup {
  class Camera extends ActorComponent {
    constructor(actor: Actor);

    setOrthographicMode(enabled: boolean): Camera;
    getOrthographicMode(): boolean;
    setOrthographicScale(scale: number): Camera;
    getOrthographicScale(): number;
  }
}
