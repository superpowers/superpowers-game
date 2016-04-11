import SceneAsset from "../data/SceneAsset";

export function importActor(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, options: SupClient.ImportIntoScenePluginOptions,
callback: (err: string, nodeId: string) => any) {
  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: null,
    onAssetTrashed: null
  };

  function onAssetReceived(assetId: string, asset: SceneAsset) {
    projectClient.unsubAsset(entry.id, subscriber);
    if (asset.nodes.pub.length !== 1) {
      callback(SupClient.i18n.t("sceneEditor:errors.prefab.mustHaveSingleRootActor"), null);
      return;
    }

    let name = entry.name;
    if (name === "Prefab") {
      let parentNode = projectClient.entries.parentNodesById[entry.id];
      if (parentNode != null) name = parentNode.name;
    }
    options.prefab = true;

    projectClient.editAsset(SupClient.query.asset, "addNode", name, options, (nodeId: string) => {
      projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", entry.id, () => {
        callback(null, nodeId);
      });
    });
  }

  projectClient.subAsset(entry.id, "scene", subscriber);
}

export let importComponent = null as any;
