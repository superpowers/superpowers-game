declare namespace SupCore {
  export interface TypeScriptAPIPlugin {
    code: string;
    defs: string;
    exposeActorComponent?: { propertyName: string; className: string; };
  }
}
