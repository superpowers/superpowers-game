declare module Sup {
  class Camera extends ActorComponent {
    constructor(actor: Actor);

    setOrthographicMode(enabled: boolean): Camera;
    getOrthographicMode(): boolean;
    setOrthographicScale(scale: number): Camera;
    getOrthographicScale(): number;

    setFOV(angle: number): Camera;
    getFOV(): number;
    getWidthToHeightRatio(): number;
    setViewport(x: number, y: number, width: number, height: number): Camera;
    getViewport(): { x: number; y: number; width: number; height: number; };
  }
}
