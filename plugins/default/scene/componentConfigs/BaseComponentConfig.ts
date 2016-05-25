class ComponentConfig extends SupCore.Data.Base.Hash {
  constructor(pub: any, schema: SupCore.Data.Schema) {
    super(pub, schema);
  }

  migrate() { return false; }

  restore() { /* Override */ }

  destroy() { /* Override */ }

  server_setProperty(client: SupCore.RemoteClient, path: string, value: number|string|boolean, callback: (err: string, path?: string, value?: any) => any) {
    this.setProperty(path, value, (err, actualValue) => {
      if (err != null) { callback(err); return; }

      callback(null, path, actualValue);
    });
  }
}
SupCore.Data.Base.ComponentConfig = ComponentConfig;
