/// <reference path="../../../SupCore/SupCore.d.ts" />

import * as fs from "fs";
import * as async from "async";
import * as mkdirp from "mkdirp";

import compileGame from "../typescriptCompiler/compileGame";

const scriptNames: string[] = [];
const scripts: {[name: string]: string} = {};

SupCore.system.serverBuild = (server: ProjectServer, buildPath: string, callback: (err: string) => void) => {
  const assetIdsToExport: string[] = [];
  server.data.entries.walk((entry: SupCore.Data.EntryNode, parent: SupCore.Data.EntryNode) => {
    if (entry.type != null) assetIdsToExport.push(entry.id);
  });

  fs.mkdirSync(`${buildPath}/assets`);
  scriptNames.length = 0;

  async.each(assetIdsToExport, (assetId, cb) => {
    server.data.assets.acquire(assetId, null, (err: Error, asset: SupCore.Data.Base.Asset) => {
      const entry = server.data.entries.byId[assetId];
      if (entry.type === "script") {
        const scriptName = `${server.data.entries.getPathFromId(assetId)}.ts`;
        scriptNames.push(scriptName);
        scripts[scriptName] = `${asset.pub.text}\n`;

        server.data.assets.release(assetId, null);
        cb();
        return;
      }

      const folderPath = `${buildPath}/assets/${server.data.entries.getStoragePathFromId(assetId)}`;
      mkdirp(folderPath, (err) => {
        asset.save(folderPath, (err) => {
          server.data.assets.release(assetId, null);
          cb();
        });
      });
    });
  }, (err) => {
    if (err != null) { callback("Could not export all assets"); return; }

    fs.mkdirSync(`${buildPath}/resources`);

    async.each(Object.keys(server.system.data.resourceClasses), (resourceId, cb) => {
      server.data.resources.acquire(resourceId, null, (err: Error, resource: SupCore.Data.Base.Resource) => {
        const folderPath = `${buildPath}/resources/${resourceId}`;
        fs.mkdir(folderPath, (err) => {
          resource.save(folderPath, (err) => {
            server.data.resources.release(resourceId, null);
            cb();
          });
        });
      });
    }, (err) => {
      if (err != null) { callback("Could not export all resources"); return; }

      const gameName = server.data.manifest.pub.name;
      const json = JSON.stringify({ name: gameName, assets: server.data.entries.getForStorage(["script"]) }, null, 2);
      fs.writeFile(`${buildPath}/project.json`, json, { encoding: "utf8" }, (err) => {
        if (err != null) { callback("Could not save project.json"); return; }

        // Pre-compile scripts
        compileGame(gameName, server.system, false, scriptNames, scripts, (err, code) => {
          if (err != null) { callback("Could not compile game"); return; }

          fs.writeFile(`${buildPath}/script.js`, code, { encoding: "utf8" }, (err) => {
            if (err != null) { callback("Could not save script.js"); return; }

            callback(null);
          });
        });
      });
    });
  });
};
