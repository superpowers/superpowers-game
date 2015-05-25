import SceneAsset from "./SceneAsset";

export default class PrefabConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    sceneAssetId: { type: "string?", min: 0, mutable: true }
  };

  static create() {
    return {
      sceneAssetId: <string>null
    };
  };

  serverData: SupCore.data.ProjectServerData;

  constructor(pub: any, serverData: SupCore.data.ProjectServerData) {
    super(pub, PrefabConfig.schema);
    this.serverData = serverData;
  }

  restore() { if (this.pub.sceneAssetId != null) this.emit("addDependencies", [ this.pub.sceneAssetId ]); }
  destroy() { if (this.pub.sceneAssetId != null) this.emit("removeDependencies", [ this.pub.sceneAssetId ]); }

  setProperty(path: string, value: any, callback: (err: string, actualValue?: any) => any) {
    let oldDepId: string;

    let finish = () => {
      super.setProperty(path, value, (err, actualValue) => {
        if (err != null) { callback(err); return; }

        if (path === "sceneAssetId") {
          if (oldDepId != null) this.emit("removeDependencies", [ oldDepId ]);
          if (actualValue != null) this.emit("addDependencies", [ actualValue ]);
        }
        callback(null, actualValue);
      });
    }


    if (path === "sceneAssetId") {
      oldDepId = this.pub[path];

      // Make sure a scene which contains prefab cannot be instanciated in an other scene
      if (value != null) {
        for (let assetId of this.serverData.entries.dependenciesByAssetId[value]) {
          let entry = this.serverData.entries.byId[assetId];
          if (entry.type === "scene") {
            callback("Can't reference a scene which already has prefabs itself");
            return;
          }
        }

        this.serverData.assets.acquire(value, this, (error: Error, asset: SceneAsset) => {
          let rootActorsCount = 0;
          for (let node of asset.pub.nodes) {
            if (asset.nodes.parentNodesById[node.id] == null) rootActorsCount++;
          }
          this.serverData.assets.release(value, this);

          if (rootActorsCount === 1) finish();
          else callback("A prefab must have only one root actor");
        })

      } else finish();
    }
  }
}
