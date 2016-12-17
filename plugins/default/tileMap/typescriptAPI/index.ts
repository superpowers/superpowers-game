/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.TileMap", {
  code: fs.readFileSync(`${__dirname}/Sup.TileMap.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TileMap.d.ts.txt`, { encoding: "utf8"})
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.TileSet", {
  code: fs.readFileSync(`${__dirname}/Sup.TileSet.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TileSet.d.ts.txt`, { encoding: "utf8" })
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "TileMapRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.TileMapRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.TileMapRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: "tileMapRenderer: Sup.TileMapRenderer;"
});
