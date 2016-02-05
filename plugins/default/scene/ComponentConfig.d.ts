declare namespace SupCore {
  namespace Data {
    interface ComponentConfigClass {
      new(pub: any, sceneAsset?: any): Base.ComponentConfig;
      create(): any;
      migrate? (config: any): boolean;
    }

    namespace Base {
      class ComponentConfig extends Hash {
        constructor(pub: any, schema: SupCore.Data.Schema);

        // OVERRIDE: Called when loading a scene
        // Check for any error/warning/info and this.emit("setBadge", ...) as required
        // Also if the component depends on assets, this.emit("addDependencies", ...) with a list of entry IDs
        restore(): void;

        // OVERRIDE: Called when destroying a component or its actor
        // If the component depends on assets, this.emit("removeDependencies", ...) with a list of entry IDs
        destroy(): void;

        // OVERRIDE: Called when editing a property
        // You can check for asset dependency changes by overriding this method
        // and calling this.emit("addDependencies" / "removeDependencies", ...) as needed
        // setProperty(path, value, callback) {}

        server_setProperty(client: any, path: string, value: number|string|boolean, callback: (err: string, path?: string, value?: any) => any): void;
      }
    }
  }
}