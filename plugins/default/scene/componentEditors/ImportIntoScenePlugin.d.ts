declare namespace SupClient {
  export type ImportIntoScenePluginOptions = { transform: { position: { x: number; y: number; z: number; }}; prefab: boolean; };
  export interface ImportIntoScenePlugin {
    importActor(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, options: ImportIntoScenePluginOptions, callback: (err: string, nodeId: string) => any): any;
    importComponent(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, nodeId: string, callback: (err: string, nodeId: string) => any): any;
  }
}
