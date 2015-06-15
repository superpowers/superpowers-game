import SceneAsset from "./SceneAsset";

export interface Component {
  id?: string;
  type: string;
  config: any;
}

export default class SceneComponents extends SupCore.data.base.ListById {

  static schema = {
    type: { type: "string" },
    config: { type: "any" },
  };

  configsById: { [id: string]: SupCore.data.base.ComponentConfig } = {};
  sceneAsset: SceneAsset;

  constructor(pub: any, sceneAsset?: SceneAsset) {
    super(pub, SceneComponents.schema);
    this.sceneAsset = sceneAsset;

    for (let item of this.pub) {
      let componentConfigClass = SupCore.data.componentConfigClasses[item.type];

      if (componentConfigClass == null) {
        if (sceneAsset != null) {
          let scenePath = sceneAsset.serverData.entries.getPathFromId(sceneAsset.id);
          throw new Error(`Could not find component config class for type ${item.type} in scene ${scenePath} of project ${sceneAsset.serverData.manifest.pub.name} (${sceneAsset.serverData.manifest.pub.id})`);
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

      let componentConfigClass = SupCore.data.componentConfigClasses[component.type];
      this.configsById[component.id] = new componentConfigClass(component.config, this.sceneAsset);

      callback(null, actualIndex);
    });
  }

  client_add(component: any, index: number) {
    super.client_add(component, index);

    let componentConfigClass = SupCore.data.componentConfigClasses[component.type];
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
