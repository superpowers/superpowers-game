/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "Sup.TileMap", {
  code: fs.readFileSync(`${__dirname}/Sup.TileMap.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TileMap.d.ts.txt`, { encoding: "utf8"})
});

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "Sup.TileSet", {
  code: fs.readFileSync(`${__dirname}/Sup.TileSet.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TileSet.d.ts.txt`, { encoding: "utf8" })
});

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "TileMapRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.TileMapRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TileMapRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "tileMapRenderer", className: "Sup.TileMapRenderer" }
});
