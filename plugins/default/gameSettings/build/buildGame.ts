import * as async from "async";
import * as path from "path";

let projectClient: SupClient.ProjectClient;
const subscribersByAssetId: { [assetId: string]: SupClient.AssetSubscriber } = {};
const subscribersByResourceId: { [resourceId: string] : SupClient.ResourceSubscriber } = {};

let entriesSubscriber: SupClient.EntriesSubscriber;
let entries: SupCore.Data.Entries;

let settings: GameBuildSettings;

const progress = { index: 0, total: 0, errors: 0 };
const statusElt = document.querySelector(".status");
const progressElt = document.querySelector("progress") as HTMLProgressElement;
const detailsListElt = document.querySelector(".details ol") as HTMLOListElement;

interface ClientExportableAsset extends SupCore.Data.Base.Asset {
  clientExport: (outputPath: string, callback: (err: Error) => void) => void;
}

interface ClientExportableResource extends SupCore.Data.Base.Resource {
  clientExport: (outputPath: string, callback: (err: Error) => void) => void;
}

function loadPlugins(callback: Function) {
  async.series([
    (cb) => { SupClient.loadScript(`/systems/${SupCore.system.id}/SupEngine.js`, cb); },
    (cb) => { SupClient.loadScript(`/systems/${SupCore.system.id}/plugins/default/scene/BaseComponentConfig.js`, cb); },
    (cb) => {
      async.each(SupCore.system.pluginsInfo.list, (pluginName, cb) => {
        const pluginPath = `/systems/${SupCore.system.id}/plugins/${pluginName}`;
        async.each([ "data", "componentConfigs" ], (name, cb) => {
          SupClient.loadScript(`${pluginPath}/bundles/${name}.js`, cb);
        }, cb);
      }, cb);
    }
  ], () => { callback(); });
}

export default function build(socket: SocketIOClient.Socket, theSettings: GameBuildSettings) {
  settings = theSettings;

  loadPlugins(() => {
    projectClient = new SupClient.ProjectClient(socket);
    entriesSubscriber = { onEntriesReceived };
    projectClient.subEntries(entriesSubscriber);
  });
}

function onEntriesReceived(theEntries: SupCore.Data.Entries) {
  entries = theEntries;
  projectClient.unsubEntries(entriesSubscriber);

  // Manifest
  projectClient.socket.emit("sub", "manifest", null, onManifestReceived);
  progress.total++;

  // Assets
  entries.walk((entry) => {
    if (entry.type != null) {
      // Only subscribe to assets that can be exported
      if (SupCore.system.data.assetClasses[entry.type].prototype.clientExport != null) {
        const subscriber = { onAssetReceived };
        subscribersByAssetId[entry.id] = subscriber;

        projectClient.subAsset(entry.id, entry.type, subscriber);
        progress.total++;
      }
    }
  });

  // Resources
  for (const resourceId in SupCore.system.data.resourceClasses) {
    // Only subscribe to resources that can be exported
    if (SupCore.system.data.resourceClasses[resourceId].prototype.clientExport != null) {
      const subscriber = { onResourceReceived };
      subscribersByResourceId[resourceId] = subscriber;

      projectClient.subResource(resourceId, subscriber);
      progress.total++;
    }
  }

  // TODO: Extra build files
  const systemBuildFiles = [ "/SupCore.js" ];
  const pluginsInfo = SupCore.system.pluginsInfo;
  const systemPath = `/systems/${SupCore.system.id}`;

  for (const plugin of pluginsInfo.list) {
    systemBuildFiles.push(`${systemPath}/plugins/${plugin}/bundles/components.js`);
    systemBuildFiles.push(`${systemPath}/plugins/${plugin}/bundles/runtime.js`);
    systemBuildFiles.push(`${systemPath}/plugins/${plugin}/bundles/typescriptAPI.js`);
  }

  systemBuildFiles.push(`${systemPath}/plugins.json`);
  systemBuildFiles.push(`${systemPath}/index.html`);
  systemBuildFiles.push(`${systemPath}/index.css`);
  systemBuildFiles.push(`${systemPath}/images/superpowers-splash.svg`);
  systemBuildFiles.push(`${systemPath}/SupEngine.js`);
  systemBuildFiles.push(`${systemPath}/SupRuntime.js`);

  for (const systemBuildFile of systemBuildFiles) {
    let localBuildFile = systemBuildFile;
    if (localBuildFile.indexOf(systemPath) === 0) localBuildFile = systemBuildFile.substring(systemPath.length).replace("/", path.sep);
    const outputPath = `${settings.outputFolder}${localBuildFile}`;

    progress.total++;
    SupClient.fetch(systemBuildFile, "text", (err, data) => {
      if (err != null) {
        console.log(err);
        progress.errors++;
        SupClient.html("li", { parent: detailsListElt, textContent: SupClient.i18n.t("builds:game.errors.exportFailed", { path: outputPath }) });
        progress.index++;
        updateProgress();
        return;
      }

      const outputDirname = path.dirname(outputPath);
      SupApp.mkdirp(outputDirname, (err) => {
        if (err != null && outputDirname !== settings.outputFolder) {
          progress.errors++;
          SupClient.html("li", { parent: detailsListElt, textContent: SupClient.i18n.t("builds:game.errors.exportFailed", { path: outputPath }) });
          progress.index++;
          updateProgress();
          return;
        }

        SupApp.writeFile(outputPath, data, (err) => {
          if (err != null) {
            progress.errors++;
            SupClient.html("li", { parent: detailsListElt, textContent: SupClient.i18n.t("builds:game.errors.exportFailed", { path: outputPath }) });
          }

          progress.index++;
          updateProgress();
        });
      });
    });
  }

  updateProgress();
}

function onManifestReceived(err: string, manifestPub: SupCore.Data.ProjectManifestPub) {
  projectClient.socket.emit("unsub", "manifest");

  const exportedProject = { name: manifestPub.name, assets: entries.getForStorage() };
  const json = JSON.stringify(exportedProject, null, 2);

  const projectPath = `${settings.outputFolder}/project.json`;
  SupApp.writeFile(projectPath, json, { encoding: "utf8" }, (err) => {
    if (err != null) {
      progress.errors++;
      SupClient.html("li", { parent: detailsListElt, textContent: SupClient.i18n.t("builds:game.errors.exportFailed", { path: projectPath }) });
    }

    progress.index++;
    updateProgress();
  });
}

function updateProgress() {
  progressElt.max = progress.total;
  progressElt.value = progress.index;

  if (progress.index < progress.total) {
    statusElt.textContent = SupClient.i18n.t("builds:game.progress", { path: settings.outputFolder, index: progress.index, total: progress.total });
  } else if (progress.errors > 0) {
    statusElt.textContent = SupClient.i18n.t("builds:game.doneWithErrors", { path: settings.outputFolder, total: progress.total, errors: progress.errors });
  } else {
    statusElt.textContent = SupClient.i18n.t("builds:game.done", { path: settings.outputFolder, total: progress.total });
  }
}

function onAssetReceived(assetId: string, asset: ClientExportableAsset) {
  projectClient.unsubAsset(assetId, subscribersByAssetId[assetId]);
  delete subscribersByAssetId[assetId];

  const outputFolder = `${settings.outputFolder}/assets/${entries.getStoragePathFromId(assetId)}`;

  SupApp.mkdirp(outputFolder, () => {
    asset.clientExport(outputFolder, (err) => {
      if (err != null) {
        progress.errors++;
        SupClient.html("li", { parent: detailsListElt, textContent: SupClient.i18n.t("builds:game.errors.exportFailed", { path: outputFolder }) });
      }

      progress.index++;
      updateProgress();
    });
  });
}

function onResourceReceived(resourceId: string, resource: ClientExportableResource) {
  projectClient.unsubResource(resourceId, subscribersByResourceId[resourceId]);
  delete subscribersByAssetId[resourceId];

  const outputFolder = `${settings.outputFolder}/resources/${resourceId}`;

  SupApp.mkdirp(outputFolder, () => {
    resource.clientExport(outputFolder, (err) => {
      if (err != null) {
        progress.errors++;
        SupClient.html("li", { parent: detailsListElt, textContent: SupClient.i18n.t("builds:game.errors.exportFailed", { path: outputFolder }) });
      }

      progress.index++;
      updateProgress();
    });
  });
}
