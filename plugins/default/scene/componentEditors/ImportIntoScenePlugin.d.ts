declare namespace SupClient {
  export type ImportIntoScenePluginOptions = { transform: { position: { x: number; y: number; z: number; }}; prefab: boolean; };
  export interface ImportIntoScenePlugin {
    (entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, options: ImportIntoScenePluginOptions, callback: (err: string, nodeId: string) => any): any;
  }
}
