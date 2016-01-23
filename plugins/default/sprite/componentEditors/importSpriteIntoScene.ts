import SpriteAsset from "../data/SpriteAsset";
import { Component } from "../../scene/data/SceneComponents";

export default function importSpriteIntoScene(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, callback: (err?: string) => any) {
  const subscriber: SupClient.AssetSubscriber = {
    onAssetReceived,
    onAssetEdited: null,
    onAssetTrashed: null
  };

  function onAssetReceived(assetId: string, asset: SpriteAsset) {
    const options = {
      // TODO: Place it where the mouse dropped it
      transform: { position: { x: 0, y: 0, z: 0 } },
    };

    projectClient.editAsset(SupClient.query.asset, "addNode", entry.name, options, (err: string, nodeId: string) => {
      if (err != null) {
        projectClient.unsubAsset(entry.id, subscriber);
        callback(err);
        return;
      }

      projectClient.editAsset(SupClient.query.asset, "addComponent", nodeId, "SpriteRenderer", null, (err: string, componentId: Component) => {
        if (err != null) {
          projectClient.unsubAsset(entry.id, subscriber);
          callback(err);
          return;
        }

        projectClient.editAsset(SupClient.query.asset, "editComponent", nodeId, componentId, "setProperty", "spriteAssetId", entry.id, (err: string) => {
          projectClient.unsubAsset(entry.id, subscriber);
          if (err != null) { callback(err); return; }
          callback();
        });
      });
    });
  }

  projectClient.subAsset(entry.id, "sprite", subscriber);
}
