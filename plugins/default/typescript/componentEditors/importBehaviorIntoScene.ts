import BehaviorPropertiesResource from "../data/BehaviorPropertiesResource";

export function importActor(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, options: SupClient.ImportIntoScenePluginOptions,
callback: (err: string, nodeId: string) => any) {
  getBehaviorName(projectClient, entry.id, (err, behaviorName) => {
    if (err != null) { callback(err, null); return; }

    let name = entry.name;
    if (name === "Behavior" || name === "Behaviour") {
      let parentNode = projectClient.entries.parentNodesById[entry.id];
      if (parentNode != null) name = parentNode.name;
    }

    projectClient.editAsset(SupClient.query.asset, "addNode", name, options, (nodeId: string) => {
      importComponent(entry, projectClient, nodeId, (err) => { callback(err, nodeId); } );
    });
  });
}

export function importComponent(entry: SupCore.Data.EntryNode, projectClient: SupClient.ProjectClient, nodeId: string, callback: (err: string) => any) {
  getBehaviorName(projectClient, entry.id, (err, behaviorName) => {
    if (err != null) { callback(err); return; }

    projectClient.editAsset(SupClient.query.asset, "addComponent", nodeId, "Behavior", null, (componentId: string) => {
      projectClient.editAsset(SupClient.query.asset, "editComponent", nodeId, componentId, "setProperty", "behaviorName", behaviorName, callback);
    });
  });
}

function getBehaviorName(projectClient: SupClient.ProjectClient, scriptId: string, callback: (err: string, behaviorName: string) => void) {
  const subscriber: SupClient.ResourceSubscriber = {
    onResourceReceived,
    onResourceEdited: null
  };

  function onResourceReceived(resourceId: string, resource: BehaviorPropertiesResource) {
    projectClient.unsubResource("behaviorProperties", subscriber);

    if (resource.behaviorNamesByScriptId[scriptId] == null) {
      callback(SupClient.i18n.t("sceneEditor:errors.script.noBehaviorsFound"), null);
      return;
    }
    callback(null, resource.behaviorNamesByScriptId[scriptId][0]);
  }
  projectClient.subResource("behaviorProperties", subscriber);
}
