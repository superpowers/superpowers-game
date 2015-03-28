declare module Sup {

  function log(message?: any, ...optionalParams: any[]): void;
  function exit();

  class Asset {
    name: string;
    type: string;
    children: Array<string>;
    constructor(inner: {[key:string]: any;});
  }

  class Folder extends Asset {
    dummyFolderMember;
  }

  function get(path: string, options?: { "ignoreMissing": boolean; }): Asset;
  function get<T extends Asset>(path: string, type: new(inner: {[key:string]: any;}) => T, options?: { "ignoreMissing": boolean; }): T;

  function getActor(name: string): Actor;
  function destroyAllActors(): void;

  class ActorComponent {
    actor: Actor;
    constructor(actor: Actor);
    destroy(): void;
  }

  class Behavior extends ActorComponent {
    constructor(actor: any, properties?: { [key: string]: any; });
  }

  function registerBehavior(behavior: any): void;

}
