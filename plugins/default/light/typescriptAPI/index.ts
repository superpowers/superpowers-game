/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Light", {
  code: fs.readFileSync(`${__dirname}/Sup.Light.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.Light.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: "light: Sup.Light;"
});
