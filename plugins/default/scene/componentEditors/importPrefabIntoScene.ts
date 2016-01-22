import SceneAsset from "../data/SceneAsset";

export default function importPrefabIntoScene(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, callback: (err?: string) => any) {
  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: null,
    onAssetTrashed: null
  };

  function onAssetReceived(assetId: string, asset: SceneAsset) {
    if (asset.nodes.pub.length !== 1) {
      projectClient.unsubAsset(entry.id, subscriber);
      callback(SupClient.i18n.t("sceneEditor:errors.prefab.mustHaveSingleRootActor"));
      return;
    }

    const options = {
      // TODO: Place it where the mouse dropped it
      transform: { position: { x: 0, y: 0, z: 0 } },
      prefab: true
    };

    projectClient.editAsset(SupClient.query.asset, "addNode", entry.name, options, (err: string, nodeId: string) => {
      if (err != null) {
        projectClient.unsubAsset(entry.id, subscriber);
        callback(err);
        return;
      }

      projectClient.editAsset(SupClient.query.asset, "setNodeProperty", nodeId, "prefab.sceneAssetId", entry.id, (err: string) => {
        projectClient.unsubAsset(entry.id, subscriber);
        if (err != null) { callback(err); return; }
        callback();
      });
    });
  }

  projectClient.subAsset(entry.id, "scene", subscriber);
}
