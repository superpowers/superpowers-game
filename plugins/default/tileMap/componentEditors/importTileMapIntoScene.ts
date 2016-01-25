import TileMapAsset from "../data/TileMapAsset";
import { Component } from "../../scene/data/SceneComponents";

export default function importTileMapIntoScene(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, options: SupClient.ImportIntoScenePluginOptions,
callback: (err: string, nodeId: string) => any) {
  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: null,
    onAssetTrashed: null
  };

  function onAssetReceived(assetId: string, asset: TileMapAsset) {
    let name = entry.name;
    if (name === "TileMap") {
      let parentNode = projectClient.entries.parentNodesById[entry.id];
      if (parentNode != null) name = parentNode.name;
    }

    projectClient.editAsset(SupClient.query.asset, "addNode", name, options, (err: string, nodeId: string) => {
      if (err != null) {
        projectClient.unsubAsset(entry.id, subscriber);
        callback(err, null);
        return;
      }

      projectClient.editAsset(SupClient.query.asset, "addComponent", nodeId, "TileMapRenderer", null, (err: string, componentId: Component) => {
        if (err != null) {
          projectClient.unsubAsset(entry.id, subscriber);
          callback(err, null);
          return;
        }

        projectClient.editAsset(SupClient.query.asset, "editComponent", nodeId, componentId, "setProperty", "tileMapAssetId", entry.id, (err: string) => {
          projectClient.unsubAsset(entry.id, subscriber);
          if (err != null) { callback(err, null); return; }
          callback(null, nodeId);
        });
      });
    });
  }

  projectClient.subAsset(entry.id, "tileMap", subscriber);
}
