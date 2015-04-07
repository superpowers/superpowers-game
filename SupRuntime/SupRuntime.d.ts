declare module SupRuntime {
  var plugins: any;
  function registerPlugin(name: string, plugin: any);

  var resourcePlugins: any;
  function registerResource(name: string, plugin: any);

  class Player {

    static updateInterval: number;
    static maxAccumulatedTime: number;

    canvas: HTMLCanvasElement;
    dataURL: URL;

    gameInstance: SupEngine.GameInstance;

    entriesById: any;
    entriesByPath: any;
    resources: any;

    outerAssetsById: any;

    accumulatedTime: number;
    lastTimestamp: number;
    tickAnimationFrameId: number;

    constructor(canvas: HTMLCanvasElement, dataURL, options: {debug?: boolean;});
    load(progressCallback, callback);
    run();
    getAssetData(path: string, responseType: string, callback: (err: Error, data?: any) => any): any;
    getOuterAsset(assetId: number): any;
    createActor();
    createComponent();
  }
}
