/// <reference path="../../typescript/api/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "Sup.Tween", {
  code: fs.readFileSync(`${__dirname}/Sup.Tween.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Tween.d.ts.txt`, { encoding: "utf8" })
});

SupCore.system.api.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescript", "TWEEN", {
  defs: fs.readFileSync(`${__dirname}/TWEEN.d.ts.txt`, { encoding: "utf8" }),
  code: ""
});
