import SceneAsset from "../data/SceneAsset";

export default function importPrefabIntoScene(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, options: SupClient.ImportIntoScenePluginOptions,
callback: (err: string, nodeId: string) => any) {
  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: null,
    onAssetTrashed: null
  };

  function onAssetReceived(assetId: string, asset: SceneAsset) {
    if (asset.nodes.pub.length !== 1) {
      projectClient.unsubAsset(entry.id, subscriber);
      callback(SupClient.i18n.t("sceneEditor:errors.prefab.mustHaveSingleRootActor"), null);
      return;
    }

    let name = entry.name;
    if (name === "Prefab") {
      let parentNode = projectClient.entries.parentNodesById[entry.id];
      if (parentNode != null) name = parentNode.name;
    }
    options.prefab = true;

    projectClient.editAssetNoErrorHandling(SupClient.query.asset, "addNode", name, options, (err: string, nodeId: string) => {
      if (err != null) {
        projectClient.unsubAsset(entry.id, subscriber);
        callback(err, null);
        return;
      }

      projectClient.editAssetNoErrorHandling(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", entry.id, (err: string) => {
        projectClient.unsubAsset(entry.id, subscriber);
        if (err != null) { callback(err, null); return; }
        callback(null, nodeId);
      });
    });
  }

  projectClient.subAsset(entry.id, "scene", subscriber);
}
