import info from "./info";

export let data: { projectClient?: SupClient.ProjectClient; /*cubicModelUpdater?: CubicModelRendererUpdater*/ };

export let socket = SupClient.connect(info.projectId);
socket.on("connect", onConnected);
socket.on("disconnect", SupClient.onDisconnected);

let onEditCommands: any = {};
function onConnected() {
  data = {};
  data.projectClient = new SupClient.ProjectClient(socket);

  /*
  let cubicModelActor = new SupEngine.Actor(engine.gameInstance, "Sprite");
  let cubicModelRenderer = new CubicModelRenderer(cubicModelActor);
  let config = { cubicModelAssetId: info.assetId, materialType: "basic" };
  let receiveCallbacks = { cubicModel: onAssetReceived };
  let editCallbacks = { cubicModel: onEditCommands };

  data.cubicModelUpdater = new CubicModelRendererUpdater(data.projectClient, cubicModelRenderer, config, receiveCallbacks, editCallbacks);
  */
}

function onAssetReceived() {
  // let pub = data.spriteUpdater.spriteAsset.pub;
}

