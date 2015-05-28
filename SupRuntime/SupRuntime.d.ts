///<reference path="../SupEngine/SupEngine.d.ts"/>

declare module SupRuntime {
  interface RuntimePlugin {
    loadAsset?(player: Player, entry: any, callback: (err: Error, asset?: any) => any): void;
    createOuterAsset?(player: Player, asset: any): any;
    setupComponent?(player: SupRuntime.Player, component: any, config: any): void;
    init?(player: Player, callback: Function): void;
    start?(player: Player, callback: Function): void;
    lateStart?(player: Player, callback: Function): void;
  }
  let plugins: { [name: string]: RuntimePlugin };
  function registerPlugin(name: string, plugin: RuntimePlugin): void;

  interface RuntimeResourcePlugin {
    loadResource(player: Player, resourceName: string, callback: (err: Error, resource?: any) => any): void;
  }
  let resourcePlugins: { [name: string]: RuntimeResourcePlugin };
  function registerResource(name: string, plugin: RuntimeResourcePlugin): void;

  class Player {

    static updateInterval: number;
    static maxAccumulatedTime: number;

    canvas: HTMLCanvasElement;
    dataURL: string;
    gameName: string;

    gameInstance: SupEngine.GameInstance;

    entriesById: any;
    entriesByPath: any;
    resources: any;

    outerAssetsById: any;

    accumulatedTime: number;
    lastTimestamp: number;
    tickAnimationFrameId: number;

    constructor(canvas: HTMLCanvasElement, dataURL: string, options: { debug?: boolean; });
    load(progressCallback: (progress: number, total: number) => any, callback: any): void;
    run(): void;
    getAssetData(path: string, responseType: string, callback: (err: Error, data?: any) => any): any;
    getOuterAsset(assetId: number): any;
    createActor(): any;
    createComponent(): any;
  }
}
