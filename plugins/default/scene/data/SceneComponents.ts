import SceneAsset from "./SceneAsset";

export interface Component {
  id?: string;
  type: string;
  config: any;
}

export default class SceneComponents extends SupCore.Data.Base.ListById {

  static schema: SupCore.Data.Schema = {
    type: { type: "string" },
    config: { type: "any" },
  };

  configsById: { [id: string]: SupCore.Data.Base.ComponentConfig } = {};
  sceneAsset: SceneAsset;

  constructor(pub: any, sceneAsset?: SceneAsset) {
    super(pub, SceneComponents.schema);
    this.sceneAsset = sceneAsset;

    const system = (this.sceneAsset.server != null) ? this.sceneAsset.server.system : SupCore.system;

    for (const item of this.pub) {
      const componentConfigClass = system.getPlugins<SupCore.Data.ComponentConfigClass>("componentConfigs")[item.type];

      if (componentConfigClass == null) {
        if (sceneAsset != null) {
          const scenePath = sceneAsset.server.data.entries.getPathFromId(sceneAsset.id);
          throw new Error(`Could not find component config class for type ${item.type} in scene ${scenePath} ` +
          `of project ${sceneAsset.server.data.manifest.pub.name} (${sceneAsset.server.data.manifest.pub.id})`);
        } else {
          throw new Error(`Could not find component config class for type ${item.type}`);
        }
      }

      this.configsById[item.id] = new componentConfigClass(item.config, this.sceneAsset);
    }
  }

  add(component: any, index: number, callback: (err: string, actualIndex: number) => any) {
    super.add(component, index, (err, actualIndex) => {
      if (err != null) { callback(err, null); return; }

      const componentConfigClass = this.sceneAsset.server.system.getPlugins<SupCore.Data.ComponentConfigClass>("componentConfigs")[component.type];
      this.configsById[component.id] = new componentConfigClass(component.config, this.sceneAsset);

      callback(null, actualIndex);
    });
  }

  client_add(component: any, index: number) {
    super.client_add(component, index);

    const componentConfigClass = SupCore.system.getPlugins<SupCore.Data.ComponentConfigClass>("componentConfigs")[component.type];
    this.configsById[component.id] = new componentConfigClass(component.config);
  }

  remove(id: string, callback: (err: string) => any) {
    super.remove(id, (err) => {
      if (err != null) { callback(err); return; }

      this.configsById[id].destroy();
      delete this.configsById[id];

      callback(null);
    });
  }

  client_remove(id: string) {
    super.client_remove(id);
    delete this.configsById[id];
  }
}
