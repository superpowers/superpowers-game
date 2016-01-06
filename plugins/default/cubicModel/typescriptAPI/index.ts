/// <reference path="../../typescript/typescriptAPI/TypeScriptAPIPlugin.d.ts" />

import * as fs from "fs";

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "Sup.CubicModel", {
  code: fs.readFileSync(`${__dirname}/Sup.CubicModel.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.CubicModel.d.ts.txt`, { encoding: "utf8" }),
});

SupCore.system.registerPlugin<SupCore.TypeScriptAPIPlugin>("typescriptAPI", "CubicModelRenderer", {
  code: fs.readFileSync(`${__dirname}/Sup.CubicModelRenderer.ts.txt`, { encoding: "utf8" }),
  defs: fs.readFileSync(`${__dirname}/Sup.CubicModelRenderer.d.ts.txt`, { encoding: "utf8" }),
  exposeActorComponent: { propertyName: "cubicModelRenderer", className: "Sup.CubicModelRenderer" }
});
