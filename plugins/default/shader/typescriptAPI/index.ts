/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.Shader", {
  code: fs.readFileSync(`${__dirname}/Sup.Shader.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Shader.d.ts.txt`, { encoding: "utf8" }),
});
