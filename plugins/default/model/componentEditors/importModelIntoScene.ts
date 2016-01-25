import ModelAsset from "../data/ModelAsset";
import { Component } from "../../scene/data/SceneComponents";

export default function importModelIntoScene(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, options: SupClient.ImportIntoScenePluginOptions,
callback: (err: string, nodeId: string) => any) {
  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: null,
    onAssetTrashed: null
  };

  function onAssetReceived(assetId: string, asset: ModelAsset) {
    let name = entry.name;
    if (name === "Model") {
      let parentNode = projectClient.entries.parentNodesById[entry.id];
      if (parentNode != null) name = parentNode.name;
    }

    projectClient.editAsset(SupClient.query.asset, "addNode", name, options, (err: string, nodeId: string) => {
      if (err != null) {
        projectClient.unsubAsset(entry.id, subscriber);
        callback(err, null);
        return;
      }

      projectClient.editAsset(SupClient.query.asset, "addComponent", nodeId, "ModelRenderer", null, (err: string, componentId: Component) => {
        if (err != null) {
          projectClient.unsubAsset(entry.id, subscriber);
          callback(err, null);
          return;
        }

        projectClient.editAsset(SupClient.query.asset, "editComponent", nodeId, componentId, "setProperty", "modelAssetId", entry.id, (err: string) => {
          projectClient.unsubAsset(entry.id, subscriber);
          if (err != null) { callback(err, null); return; }
          callback(null, nodeId);
        });
      });
    });
  }

  projectClient.subAsset(entry.id, "model", subscriber);
}
