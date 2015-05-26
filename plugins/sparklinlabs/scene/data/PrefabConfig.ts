import SceneAsset from "./SceneAsset";
import { Node } from "./SceneNodes";

export default class PrefabConfig extends SupCore.data.base.ComponentConfig {

  static schema = {
    sceneAssetId: { type: "string?", min: 0, mutable: true }
  };

  static create() {
    return {
      sceneAssetId: <string>null
    };
  };

  sceneAsset: SceneAsset;

  constructor(pub: any, sceneAsset: SceneAsset) {
    super(pub, PrefabConfig.schema);
    this.sceneAsset = sceneAsset;
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

    if (path !== "sceneAssetId") {
      finish();
      return;
    }

    // Check for sceneAssetId
    oldDepId = this.pub[path];
    if (value == null) {
      finish();
      return;
    }

    if (value === this.sceneAsset.id) {
      callback("A prefab can't reference itself");
      return;
    }

    // Check for infinite loop
    let canUseScene = true;
    let aquiringScene = 0;

    let checkScene = (sceneId: string) => {
      aquiringScene++;
      this.sceneAsset.serverData.assets.acquire(sceneId, this, (error: Error, asset: SceneAsset) => {
        this.sceneAsset.serverData.assets.release(sceneId, this);

        // Check the scene has only one root actor
        if (asset.pub.nodes.length !== 1) {
          callback("A prefab must have only one root actor");
          return;
        }

        let walk = (node: Node) => {
          if (! canUseScene) return;

          node.components.every((component) => {
            if (component.type === "Prefab") {
              if (component.config.sceneAssetId != null) {
                if (component.config.sceneAssetId === this.sceneAsset.id) {
                  canUseScene = false;
                  return false;
                } else checkScene(component.config.sceneAssetId);
              }
            }
            return true;
          });
          for (let child of node.children) walk(child);
        }

        for (let node of asset.pub.nodes) walk(node);

        aquiringScene--;
        if (aquiringScene === 0) {
          if (canUseScene) finish();
          else callback("Cannot use this scene, it will create an infinite loop");
        }
      });
    }
    checkScene(value);
  }
}
