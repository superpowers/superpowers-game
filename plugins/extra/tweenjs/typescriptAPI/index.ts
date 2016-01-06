/// <reference path="../../../default/typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.Tween", {
  code: fs.readFileSync(`${__dirname}/Sup.Tween.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Tween.d.ts.txt`, { encoding: "utf8" })
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "TWEEN", {
  defs: fs.readFileSync(`${__dirname}/TWEEN.d.ts.txt`, { encoding: "utf8" }),
  code: ""
});
