declare namespace SupClient {
  export interface ComponentEditorPlugin {
    new(tbody: HTMLTableSectionElement, config: any, projectClient: SupClient.ProjectClient, editConfig: any): any;
  }
}
