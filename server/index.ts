import * as fs from "fs";
import * as async from "async";

let systemBuildFiles: string[];

SupCore.system.serverBuild = (server: ProjectServer, buildPath: string, callback: (err: string, extraBuildFiles?: string[]) => void) => {
  const exportedProject = { name: server.data.manifest.pub.name, assets: server.data.entries.getForStorage() };

  fs.mkdirSync(`${buildPath}/assets`);

  const assetIdsToExport: string[] = [];
  server.data.entries.walk((entry: SupCore.Data.EntryNode, parent: SupCore.Data.EntryNode) => {
    if (entry.type != null) assetIdsToExport.push(entry.id);
  });

  async.each(assetIdsToExport, (assetId, cb) => {
    server.data.assets.acquire(assetId, null, (err: Error, asset: SupCore.Data.Base.Asset) => {
      asset.publish(buildPath, (err) => {
        server.data.assets.release(assetId, null);
        cb();
      });
    });
  }, (err) => {
    if (err != null) { callback("Could not export all assets"); return; }

    fs.mkdirSync(`${buildPath}/resources`);

    async.each(Object.keys(server.system.data.resourceClasses), (resourceId, cb) => {
      server.data.resources.acquire(resourceId, null, (err: Error, resource: SupCore.Data.Base.Resource) => {
        resource.publish(buildPath, (err) => {
          server.data.resources.release(resourceId, null);
          cb();
        });
      });
    }, (err) => {
      if (err != null) { callback("Could not export all resources"); return; }

      const json = JSON.stringify(exportedProject, null, 2);
      fs.writeFile(`${buildPath}/project.json`, json, { encoding: "utf8" }, (err) => {
        if (err != null) { callback("Could not save project.json"); return; }

        if (systemBuildFiles == null) setupSystemBuildFiles(server.system);
        callback(null, systemBuildFiles);
      });
    });
  });
};

function setupSystemBuildFiles(system: SupCore.System) {
  systemBuildFiles = [ "/SupCore.js" ];

  const pluginsInfo = system.pluginsInfo;

  for (const plugin of pluginsInfo.list) {
    systemBuildFiles.push(`/systems/${system.id}/plugins/${plugin}/bundles/components.js`);
    systemBuildFiles.push(`/systems/${system.id}/plugins/${plugin}/bundles/runtime.js`);
  }

  systemBuildFiles.push(`/systems/${system.id}/index.html`);
  systemBuildFiles.push(`/systems/${system.id}/index.css`);
  systemBuildFiles.push(`/systems/${system.id}/images/superpowers-splash.svg`);
  systemBuildFiles.push(`/systems/${system.id}/SupEngine.js`);
  systemBuildFiles.push(`/systems/${system.id}/SupRuntime.js`);
}
