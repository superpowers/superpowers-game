declare namespace SupClient {
  export interface ImportIntoScenePlugin {
    (entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, callback: (err?: string) => any): any;
  }
}
