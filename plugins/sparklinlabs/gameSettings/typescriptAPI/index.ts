/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.Game", {
  code: fs.readFileSync(`${__dirname}/Sup.Game.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Game.d.ts.txt`, { encoding: "utf8"})
});
