/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.Scene", {
  code: fs.readFileSync(`${__dirname}/Sup.Scene.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Scene.d.ts.txt`, { encoding: "utf8" }),
});
